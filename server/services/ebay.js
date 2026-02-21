const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const SEARCH_URL = 'https://api.ebay.com/buy/browse/v1/item_summary/search';

let cachedToken = null;
let tokenExpiresAt = 0;

function isConfigured() {
  return !!(EBAY_CLIENT_ID && EBAY_CLIENT_SECRET);
}

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay OAuth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // Expire 5 minutes early to be safe
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

async function searchPrices(query) {
  if (!isConfigured()) {
    return null;
  }

  try {
    const token = await getAccessToken();

    const params = new URLSearchParams({
      q: query,
      filter: 'buyingOptions:{FIXED_PRICE}',
      limit: '20',
    });

    const res = await fetch(`${SEARCH_URL}?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
      },
    });

    if (!res.ok) {
      console.error(`eBay search failed (${res.status}): ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    const items = data.itemSummaries || [];

    if (items.length === 0) {
      return { avgPrice: null, lowPrice: null, highPrice: null, resultCount: 0 };
    }

    const prices = items
      .map((item) => parseFloat(item.price?.value))
      .filter((p) => !isNaN(p) && p > 0);

    if (prices.length === 0) {
      return { avgPrice: null, lowPrice: null, highPrice: null, resultCount: items.length };
    }

    const sum = prices.reduce((a, b) => a + b, 0);
    return {
      avgPrice: Math.round((sum / prices.length) * 100) / 100,
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      resultCount: prices.length,
    };
  } catch (err) {
    console.error('eBay search error:', err.message);
    return null;
  }
}

module.exports = { searchPrices, isConfigured };
