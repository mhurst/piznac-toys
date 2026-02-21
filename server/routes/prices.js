const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/auth');
const { searchPrices, isConfigured } = require('../services/ebay');

const router = express.Router();
const prisma = new PrismaClient();

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function lookupAndCache(figure) {
  const searchQuery = `${figure.name} ${figure.toyLine.name}`;
  const result = await searchPrices(searchQuery);

  if (!result) {
    return null;
  }

  const cached = await prisma.priceCache.upsert({
    where: { figureId: figure.id },
    update: {
      searchQuery,
      avgPrice: result.avgPrice,
      lowPrice: result.lowPrice,
      highPrice: result.highPrice,
      resultCount: result.resultCount,
      lastUpdated: new Date(),
    },
    create: {
      figureId: figure.id,
      searchQuery,
      avgPrice: result.avgPrice,
      lowPrice: result.lowPrice,
      highPrice: result.highPrice,
      resultCount: result.resultCount,
    },
  });

  return cached;
}

// GET /api/prices/figure/:figureId — public, returns cached or fresh price data
router.get('/figure/:figureId', optionalAuth, async (req, res) => {
  try {
    const figureId = parseInt(req.params.figureId);
    if (isNaN(figureId)) {
      return res.status(400).json({ error: 'Invalid figure ID' });
    }

    const figure = await prisma.figure.findUnique({
      where: { id: figureId },
      include: { toyLine: true },
    });

    if (!figure) {
      return res.status(404).json({ error: 'Figure not found' });
    }

    if (!isConfigured()) {
      return res.json({
        avgPrice: null,
        lowPrice: null,
        highPrice: null,
        resultCount: 0,
        lastUpdated: null,
        searchQuery: null,
        configured: false,
      });
    }

    // Check cache
    const cached = await prisma.priceCache.findUnique({
      where: { figureId },
    });

    if (cached && (Date.now() - cached.lastUpdated.getTime()) < CACHE_MAX_AGE_MS) {
      return res.json({
        avgPrice: cached.avgPrice,
        lowPrice: cached.lowPrice,
        highPrice: cached.highPrice,
        resultCount: cached.resultCount,
        lastUpdated: cached.lastUpdated,
        searchQuery: cached.searchQuery,
        configured: true,
      });
    }

    // Cache miss or stale — fetch fresh
    const fresh = await lookupAndCache(figure);
    if (!fresh) {
      return res.json({
        avgPrice: null,
        lowPrice: null,
        highPrice: null,
        resultCount: 0,
        lastUpdated: null,
        searchQuery: `${figure.name} ${figure.toyLine.name}`,
        configured: true,
      });
    }

    res.json({
      avgPrice: fresh.avgPrice,
      lowPrice: fresh.lowPrice,
      highPrice: fresh.highPrice,
      resultCount: fresh.resultCount,
      lastUpdated: fresh.lastUpdated,
      searchQuery: fresh.searchQuery,
      configured: true,
    });
  } catch (err) {
    console.error('Price lookup error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/prices/figure/:figureId/refresh — admin only, force refresh
router.post('/figure/:figureId/refresh', requireAuth, requireAdmin, async (req, res) => {
  try {
    const figureId = parseInt(req.params.figureId);
    if (isNaN(figureId)) {
      return res.status(400).json({ error: 'Invalid figure ID' });
    }

    const figure = await prisma.figure.findUnique({
      where: { id: figureId },
      include: { toyLine: true },
    });

    if (!figure) {
      return res.status(404).json({ error: 'Figure not found' });
    }

    if (!isConfigured()) {
      return res.status(503).json({ error: 'eBay API not configured' });
    }

    const fresh = await lookupAndCache(figure);
    if (!fresh) {
      return res.status(502).json({ error: 'eBay API request failed' });
    }

    res.json({
      avgPrice: fresh.avgPrice,
      lowPrice: fresh.lowPrice,
      highPrice: fresh.highPrice,
      resultCount: fresh.resultCount,
      lastUpdated: fresh.lastUpdated,
      searchQuery: fresh.searchQuery,
      configured: true,
    });
  } catch (err) {
    console.error('Price refresh error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
