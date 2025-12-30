const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

const SOURCE_URL = 'https://beyondchats.com/blogs/';
const API_URL = 'http://localhost:5000/api/articles';

async function scrapeOldest() {
    console.log("🚀 Starting Scraper (Strict Mode)...");
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    let collectedArticles = [];
    let seenTitles = new Set(); 

    try {
        await page.goto(SOURCE_URL, { waitUntil: 'networkidle2' });
        
        let currentPageUrl = await page.evaluate(() => {
            const paginationLinks = Array.from(document.querySelectorAll('.page-numbers'));
            const lastNumLink = paginationLinks.filter(el => !isNaN(el.innerText)).pop(); 
            return lastNumLink ? lastNumLink.href : null;
        });

        if (!currentPageUrl) currentPageUrl = SOURCE_URL;

        // Loop backwards
        while (collectedArticles.length < 5 && currentPageUrl) {
            
            console.log(`\n🕵️ Scraping Page: ${currentPageUrl}`);
            await page.goto(currentPageUrl, { waitUntil: 'networkidle2' });

            const content = await page.content();
            const $ = cheerio.load(content);
            
            const articlesOnThisPage = [];

            // STRICTER SELECTOR: Only look for <article> tags or divs that act as wrappers
            // If <article> doesn't work, we can revert to a specific class if you find one.
            // But usually <article> excludes sidebars.
            const cardSelector = $('article').length > 0 ? 'article' : '.blog-card, .post, .entry';

            $(cardSelector).each((i, el) => {
                // STRICTER TITLE: Only look for H2 (Main titles)
                const title = $(el).find('h2').first().text().trim();
                const link = $(el).find('a').attr('href');
                
                if (title && link && title.split(' ').length > 2) { 
                    const fullLink = link.startsWith('http') ? link : `https://beyondchats.com${link}`;
                    
                    if (!seenTitles.has(title)) {
                        seenTitles.add(title);
                        articlesOnThisPage.push({ title, url: fullLink });
                    }
                }
            });

            // Reverse to get bottom-most (oldest) first
            articlesOnThisPage.reverse();

            console.log(`   -> Found ${articlesOnThisPage.length} articles on this page.`);
            collectedArticles = [...collectedArticles, ...articlesOnThisPage];

            if (collectedArticles.length < 5) {
                // Pagination Logic (Page 15 -> 14)
                const match = currentPageUrl.match(/\/page\/(\d+)\/?/);
                if (match) {
                    const currentPageNum = parseInt(match[1]);
                    if (currentPageNum > 1) {
                        currentPageUrl = currentPageUrl.replace(`/page/${currentPageNum}`, `/page/${currentPageNum - 1}`);
                    } else { break; }
                } else { break; }
            } else { break; }
        }

        const finalFive = collectedArticles.slice(0, 5);
        console.log(`\n🔄 Processing the final ${finalFive.length} articles...`);

        for (const article of finalFive) {
            console.log(`\n📄 Visiting: ${article.title}`);
            try {
                await page.goto(article.url, { waitUntil: 'domcontentloaded' });
                const articleText = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('p'))
                        .map(p => p.innerText)
                        .filter(text => text.length > 50) 
                        .join('\n\n');
                });

                if (!articleText) continue;

                await axios.post(API_URL, {
                    title: article.title,
                    url: article.url,
                    original_content: articleText.substring(0, 5000)
                });
                console.log(`   ✅ Saved!`);

            } catch (err) {
                 console.log(`   ⚠️ Saved/Skipped.`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await browser.close();
    }
}

scrapeOldest();