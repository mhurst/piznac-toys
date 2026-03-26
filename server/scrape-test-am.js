// Build toy-urls.json from listing_page.json, then run scraper on Action Masters only
const path = require('path');
const fs = require('fs');

const BASE_URL = 'https://www.transformerland.com';
const OUTPUT_DIR = path.join(__dirname, 'data', 'transformerland');
const cacheFile = path.join(OUTPUT_DIR, 'toy-urls.json');
const listingFile = path.join(OUTPUT_DIR, 'listing_page.json');

// Build the toy-urls.json from listing data
const listing = JSON.parse(fs.readFileSync(listingFile, 'utf8'));
const allUrls = listing.toyLinks.map((l) => ({
  url: l.href.startsWith('http') ? l.href : BASE_URL + l.href,
}));

// Filter to Action Masters only
const amUrls = allUrls.filter((t) => t.url.includes('action-masters'));
console.log(`${amUrls.length} Action Master URLs (${allUrls.length} total)`);

// Save as the cache file so the scraper picks it up
fs.writeFileSync(cacheFile, JSON.stringify(amUrls, null, 2));

// Run the main scraper
require('./scrape-transformerland.js');
