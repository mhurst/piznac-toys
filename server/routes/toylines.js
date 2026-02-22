const express = require('express');
const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { upload, setPrefix, optimizeImages } = require('../middleware/upload');
const { parseId, logError } = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/toylines — list all toylines with figure count
router.get('/', async (req, res) => {
  try {
    const toylines = await prisma.toyLine.findMany({
      include: {
        _count: { select: { figures: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(toylines);
  } catch (err) {
    logError('Error fetching toylines', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/toylines/:slug — get toyline with series + tags
router.get('/:slug', async (req, res) => {
  try {
    const toyline = await prisma.toyLine.findUnique({
      where: { slug: req.params.slug },
      include: {
        series: { orderBy: { name: 'asc' }, include: { subSeries: { orderBy: { name: 'asc' } } } },
        tags: { orderBy: { name: 'asc' } },
        _count: { select: { figures: true } },
      },
    });

    if (!toyline) {
      return res.status(404).json({ error: 'Toyline not found' });
    }

    res.json(toyline);
  } catch (err) {
    logError('Error fetching toyline', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/toylines — create toyline (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const toyline = await prisma.toyLine.create({
      data: { name, slug },
    });

    res.status(201).json(toyline);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Toyline already exists' });
    }
    logError('Error creating toyline', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/toylines/:id — update toyline (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const { name, coverImage } = req.body;
    const data = {};

    if (name) {
      data.name = name;
      data.slug = slugify(name, { lower: true, strict: true });
    }
    if (coverImage !== undefined) {
      data.coverImage = coverImage;
    }

    const toyline = await prisma.toyLine.update({
      where: { id },
      data,
    });

    res.json(toyline);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Toyline not found' });
    }
    logError('Error updating toyline', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/toylines/:id — delete toyline (admin, cascades)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    await prisma.toyLine.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Toyline not found' });
    }
    logError('Error deleting toyline', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/toylines/:id/cover — upload cover image (admin)
router.post('/:id/cover', requireAuth, requireAdmin, setPrefix('toyline'), upload.single('cover'), optimizeImages, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Delete old cover image file if it exists
    const existing = await prisma.toyLine.findUnique({ where: { id } });
    if (existing?.coverImage) {
      const oldPath = path.join(__dirname, '..', 'uploads', existing.coverImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const toyline = await prisma.toyLine.update({
      where: { id },
      data: { coverImage: req.file.filename },
    });

    res.json(toyline);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Toyline not found' });
    }
    logError('Error uploading cover', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
