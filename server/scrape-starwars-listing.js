const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'data', 'starwars');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  await page.goto('https://www.transformerland.com/wiki/star-wars/original-kenner-series/', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  const data = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a[href*="/wiki/toy-info/"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href && !links.some((l) => l.href === href)) {
        links.push({ href, text: a.textContent.trim() });
      }
    });
    return { toyLinks: links };
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, 'listing_page.json'), JSON.stringify(data, null, 2));
  console.log(`Found ${data.toyLinks.length} Star Wars toy links`);

  await browser.close();
}

main().catch(console.error);
