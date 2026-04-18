const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE_URL = 'https://www.transformerland.com';
const G2_WIKI_URL = `${BASE_URL}/wiki/transformers/g2/`;
const OUTPUT_DIR = path.join(__dirname, 'data', 'transformerland-g2');
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images');
const DELAY_MS = 2000;

[OUTPUT_DIR, IMAGES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').toLowerCase();
}

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    if (!url || !url.startsWith('http')) return resolve(false);
    if (fs.existsSync(filepath)) return resolve(true); // skip existing
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);
    mod.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        return downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        return resolve(false);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(true); });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      reject(err);
    });
  });
}

function makeAbsolute(url) {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return BASE_URL + url;
}

async function getAllToyUrls(browser) {
  const cacheFile = path.join(OUTPUT_DIR, 'toy-urls.json');
  if (fs.existsSync(cacheFile)) {
    console.log('Loading cached toy URLs...');
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }

  console.log('Fetching G2 toy listing page...');
  const page = await browser.newPage();
  await page.goto(G2_WIKI_URL, { waitUntil: 'networkidle2', timeout: 60000 });

  const toyUrls = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a[href*="/wiki/toy-info/transformers-g2"]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href && !links.some((l) => l.url === href)) {
        links.push({ url: href });
      }
    });
    return links;
  });

  await page.close();

  const resolved = toyUrls.map((t) => ({
    url: t.url.startsWith('http') ? t.url : BASE_URL + t.url,
  }));

  fs.writeFileSync(cacheFile, JSON.stringify(resolved, null, 2));
  console.log(`Found ${resolved.length} toy URLs`);
  return resolved;
}

async function scrapeToyPage(browser, url) {
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    const data = await page.evaluate(() => {
      const result = {
        name: '',
        subgroup: '',
        alliance: '',
        year: '',
        mainImage: null,
        setFigures: [],
        setAccessories: [],
      };

      // Parse title: "Laser Optimus Prime (Transformers, G2, Autobot)"
      const title = document.title || '';
      const titleMatch = title.match(/^(.+?)\s+(.+?)\s*\(Transformers,\s*G2,\s*(\w+)\)/);
      if (titleMatch) {
        result.subgroup = titleMatch[1].trim();
        result.name = titleMatch[2].trim();
        result.alliance = titleMatch[3].trim();
      }

      // Get year from metadata table
      const detailsName = document.querySelector('.details_name');
      if (detailsName) result.name = detailsName.textContent.trim();

      document.querySelectorAll('table tr').forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length === 2) {
          const label = cells[0].textContent.trim();
          const value = cells[1].textContent.trim();
          if (label === 'Year:') result.year = value;
          if (label === 'Subgroup:') result.subgroup = value;
          if (label === 'Alliance:') result.alliance = value;
        }
      });

      // Main product image — first reference_image from MagicZoom
      const firstZoom = document.querySelector('a.MagicZoomPlus');
      if (firstZoom) {
        const href = firstZoom.getAttribute('href');
        if (href && href.includes('reference_images')) {
          result.mainImage = href;
        }
      }

      // Parse Set Figures and Set Accessories
      document.querySelectorAll('.ArchiveGroupWrapper').forEach((wrapper) => {
        const groupName = wrapper.querySelector('.ArchiveGroupName');
        if (!groupName) return;
        const gn = groupName.textContent.trim();

        const items = [];
        wrapper.querySelectorAll('.ArchiveToyImg').forEach((toyImg) => {
          const nameMeta = toyImg.querySelector('meta[itemprop="name"]');
          const imageMeta = toyImg.querySelector('meta[itemprop="image"]');
          const titleDiv = toyImg.querySelector('.ToyDesc-Title');

          items.push({
            name: titleDiv ? titleDiv.textContent.trim() : (nameMeta ? nameMeta.content : ''),
            image: imageMeta ? imageMeta.content : null,
          });
        });

        if (gn === 'Set Figures') result.setFigures = items;
        if (gn === 'Set Accessories') result.setAccessories = items;
      });

      return result;
    });

    await page.close();
    return data;
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    await page.close();
    return null;
  }
}

async function main() {
  const resultsFile = path.join(OUTPUT_DIR, 'results.json');
  let results = {};
  if (fs.existsSync(resultsFile)) {
    results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    console.log(`Resuming — ${Object.keys(results).length} already scraped`);
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
  });

  const toyUrls = await getAllToyUrls(browser);
  console.log(`${toyUrls.length} toys total\n`);

  let processed = 0;
  let newlyScraped = 0;

  for (const toy of toyUrls) {
    // Use URL as key for resume tracking
    if (results[toy.url]) {
      processed++;
      continue;
    }

    console.log(`[${processed + 1}/${toyUrls.length}] ${toy.url}`);
    const data = await scrapeToyPage(browser, toy.url);

    if (!data) {
      processed++;
      await sleep(DELAY_MS);
      continue;
    }

    data.sourceUrl = toy.url;
    const key = sanitizeFilename(data.name || toy.url.split('/').slice(-2, -1)[0]);

    // Download main image
    if (data.mainImage) {
      const imgUrl = makeAbsolute(data.mainImage);
      const ext = path.extname(data.mainImage) || '.jpg';
      const imgFile = path.join(IMAGES_DIR, `${key}${ext}`);
      try {
        await downloadImage(imgUrl, imgFile);
        data.localMainImage = `images/${key}${ext}`;
      } catch (e) {
        console.log(`  Failed to download main image: ${e.message}`);
      }
    }

    // Download set figure images
    for (let i = 0; i < data.setFigures.length; i++) {
      const fig = data.setFigures[i];
      if (fig.image) {
        const imgUrl = makeAbsolute(fig.image);
        const figKey = `${key}_fig_${sanitizeFilename(fig.name)}`;
        const ext = path.extname(fig.image) || '.jpg';
        const imgFile = path.join(IMAGES_DIR, `${figKey}${ext}`);
        try {
          await downloadImage(imgUrl, imgFile);
          fig.localImage = `images/${figKey}${ext}`;
        } catch (e) { /* skip */ }
      }
    }

    // Download accessory images
    for (let i = 0; i < data.setAccessories.length; i++) {
      const acc = data.setAccessories[i];
      if (acc.image) {
        const imgUrl = makeAbsolute(acc.image);
        const accKey = `${key}_acc_${sanitizeFilename(acc.name)}`;
        const ext = path.extname(acc.image) || '.jpg';
        const imgFile = path.join(IMAGES_DIR, `${accKey}${ext}`);
        try {
          await downloadImage(imgUrl, imgFile);
          acc.localImage = `images/${accKey}${ext}`;
        } catch (e) { /* skip */ }
      }
    }

    results[toy.url] = data;
    newlyScraped++;
    processed++;

    // Save progress
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

    const accNames = data.setAccessories.map((a) => a.name).join(', ');
    console.log(`  ${data.name} | Figures: ${data.setFigures.length} | Accessories: ${data.setAccessories.length}${accNames ? ' (' + accNames + ')' : ''}`);

    await sleep(DELAY_MS);
  }

  await browser.close();

  console.log(`\n=== DONE ===`);
  console.log(`Total processed: ${processed}`);
  console.log(`Newly scraped: ${newlyScraped}`);
  console.log(`Results: ${resultsFile}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
