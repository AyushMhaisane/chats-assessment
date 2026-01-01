const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- CONFIGURATION ---
const API_KEY = process.env.GEMINI_API_KEY; 
const BACKEND_URL = "http://localhost:5000/api/articles";

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

puppeteer.use(StealthPlugin());

async function runProcessor() {
    console.log("🚀 Starting AI Processor (DuckDuckGo Lite + Wikipedia Fallback)...");

    let articlesToProcess = [];
    try {
        const res = await axios.get(BACKEND_URL);
        articlesToProcess = res.data.filter(a => !a.updated_content);
        console.log(`📊 Found ${articlesToProcess.length} pending articles.`);
    } catch (err) {
        console.error("❌ Backend offline. Run 'node server.js' first.");
        return;
    }

    if (articlesToProcess.length === 0) {
        console.log("✅ All articles are already updated!");
        return;
    }

    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const article of articlesToProcess) {
        console.log(`\n🤖 Processing: "${article.title}"`);
        let page;
        let searchResults = [];
        let combinedContext = "";

        try {
            page = await browser.newPage();
            // Pretend to be a real laptop
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // --- STRATEGY 1: DuckDuckGo Lite (Fast HTML) ---
            console.log("   🔍 Searching DuckDuckGo...");
            try {
                await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(article.title)}`, { 
                    waitUntil: 'domcontentloaded', // Fast wait
                    timeout: 15000 
                });

                searchResults = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('.result__a'));
                    return links
                        .map(a => a.href)
                        .filter(href => href && href.startsWith('http') && !href.includes('duckduckgo'))
                        .slice(0, 2);
                });
            } catch (err) { console.log("   ⚠️ DuckDuckGo timed out."); }

            // --- STRATEGY 2: Wikipedia (If DuckDuckGo Failed) ---
            if (searchResults.length === 0) {
                console.log("   ⚠️ Search blocked. Trying Wikipedia...");
                try {
                    await page.goto(`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(article.title)}`, { waitUntil: 'domcontentloaded' });
                    // Grab the first result link
                    const wikiLink = await page.evaluate(() => {
                        const link = document.querySelector('.mw-search-result-heading a');
                        return link ? link.href : null;
                    });
                    if (wikiLink) searchResults.push(wikiLink);
                } catch (e) { console.log("   ⚠️ Wikipedia failed."); }
            }

            console.log(`   found ${searchResults.length} sources.`);

            // --- STEP B: SCRAPE SOURCES ---
            if (searchResults.length > 0) {
                for (const link of searchResults) {
                    try {
                        console.log(`   📖 Reading: ${link}`);
                        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 15000 });
                        const text = await page.evaluate(() => {
                            return Array.from(document.querySelectorAll('p'))
                                .map(p => p.innerText)
                                .filter(t => t.length > 50)
                                .join('\n')
                                .substring(0, 1000);
                        });
                        combinedContext += `\nSOURCE (${link}):\n${text}\n`;
                    } catch (e) { console.log(`   ⚠️ Skipped link: ${e.message}`); }
                }
            } else {
                console.log("   ⚠️ No external data found. Using Internal Knowledge.");
                combinedContext = "Search unavailable. Use internal expert knowledge.";
            }

            // --- STEP C: GEMINI REWRITE ---
            console.log("   🧠 Asking Gemini to rewrite...");
            const prompt = `
            You are an expert tech editor. 
            Old Title: "${article.title}"
            Original Content: "${article.original_content ? article.original_content.substring(0, 500) : ''}..."
            
            New Research:
            ${combinedContext}
            
            TASK: Rewrite this article.
            - Integrate the "New Research" if available.
            - Use Markdown headings (##) and bullet points.
            - Add a "### References" section listing the URLs found.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const newContent = response.text();

            // --- STEP D: UPDATE DATABASE ---
            console.log("   💾 Saving to Database...");
            await axios.put(`${BACKEND_URL}/${article._id}`, {
                updated_content: newContent,
                reference_links: searchResults.length > 0 ? searchResults : ["Internal Knowledge"],
                status: 'updated'
            });

            console.log("   ✅ Done!");

        } catch (error) {
            console.error(`   ❌ Error: ${error.message}`);
        } finally {
            if (page && !page.isClosed()) await page.close();
        }
    }

    await browser.close();
    console.log("👋 Processor Finished.");
}

runProcessor();