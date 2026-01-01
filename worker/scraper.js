const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const SOURCE_URL = "https://beyondchats.com/blogs/";
const API_URL = process.env.API_URL;

async function scrapeOldestArticles()
{
    console.log("\n================ SCRAPER STARTED ================\n");

    const browser = await puppeteer.launch({ headless: true });
    console.log("[INFO] Browser launched");

    const page = await browser.newPage();
    console.log("[INFO] New browser tab opened");

    const collectedArticles = [];
    const visitedTitles = new Set();

    try
    {
        console.log("[STEP 1] Opening blog homepage");
        await page.goto(SOURCE_URL, { waitUntil: "networkidle2" });
        console.log("[SUCCESS] Blog homepage loaded");

        console.log("[STEP 2] Detecting last pagination page");
        let currentPageUrl = await page.evaluate(() =>
        {
            const pages = Array.from(document.querySelectorAll(".page-numbers"));
            const numericPages = pages.filter(p => !isNaN(p.innerText));

            return numericPages.length
                ? numericPages[numericPages.length - 1].href
                : null;
        });

        if (!currentPageUrl)
        {
            console.log("[WARN] Pagination not found, using homepage");
            currentPageUrl = SOURCE_URL;
        }
        else
        {
            console.log(`[SUCCESS] Last page detected: ${currentPageUrl}`);
        }

        while (collectedArticles.length < 5 && currentPageUrl)
        {
            console.log(`\n[STEP 3] Scraping page: ${currentPageUrl}`);
            await page.goto(currentPageUrl, { waitUntil: "networkidle2" });

            const html = await page.content();
            const $ = cheerio.load(html);

            const articlesOnPage = [];

            const selector = $("article").length
                ? "article"
                : ".blog-card, .post, .entry";

            $(selector).each((_, element) =>
            {
                const title = $(element).find("h2").first().text().trim();
                const link = $(element).find("a").attr("href");

                if (!title || !link) return;
                if (title.split(" ").length <= 2) return;
                if (visitedTitles.has(title)) return;

                visitedTitles.add(title);

                const fullUrl = link.startsWith("http")
                    ? link
                    : `https://beyondchats.com${link}`;

                articlesOnPage.push({ title, url: fullUrl });
            });

            articlesOnPage.reverse();
            collectedArticles.push(...articlesOnPage);

            console.log(`[INFO] Articles collected so far: ${collectedArticles.length}`);

            if (collectedArticles.length < 5)
            {
                const match = currentPageUrl.match(/\/page\/(\d+)/);
                if (!match) break;

                const pageNumber = Number(match[1]);
                if (pageNumber <= 1) break;

                currentPageUrl = currentPageUrl.replace(
                    `/page/${pageNumber}`,
                    `/page/${pageNumber - 1}`
                );

                console.log(`[INFO] Moving to previous page`);
            }
        }

        const finalArticles = collectedArticles.slice(0, 5);
        console.log(`\n[STEP 4] Processing ${finalArticles.length} final articles`);

        for (const article of finalArticles)
        {
            console.log(`\n[ARTICLE] Visiting: ${article.title}`);

            try
            {
                await page.goto(article.url, { waitUntil: "domcontentloaded" });

                const content = await page.evaluate(() =>
                {
                    return Array.from(document.querySelectorAll("p"))
                        .map(p => p.innerText.trim())
                        .filter(text => text.length > 50)
                        .join("\n\n");
                });

                if (!content)
                {
                    console.log("[WARN] No content found, skipping");
                    continue;
                }

                console.log("[INFO] Sending article to backend API");
                await axios.post(API_URL, {
                    title: article.title,
                    url: article.url,
                    original_content: content.substring(0, 5000)
                });

                console.log("[SUCCESS] Article saved to database");
            }
            catch
            {
                console.log("[ERROR] Failed to process article");
            }
        }
    }
    catch (error)
    {
        console.error("[FATAL] Scraper crashed:", error.message);
    }
    finally
    {
        await browser.close();
        console.log("\n[INFO] Browser closed");
        console.log("\n================ SCRAPER FINISHED ================\n");
    }
}


scrapeOldestArticles();
module.exports = { scrapeOldestArticles };