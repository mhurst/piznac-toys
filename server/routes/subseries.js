const express = require('express');
const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { parseId, logError } = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/subseries — create sub-series (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, seriesId } = req.body;

    if (!name || !seriesId) {
      return res.status(400).json({ error: 'Name and seriesId are required' });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const subSeries = await prisma.subSeries.create({
      data: { name, slug, seriesId: parseInt(seriesId) },
    });

    res.status(201).json(subSeries);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Sub-series already exists in this series' });
    }
    logError('Error creating sub-series', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/subseries/:id — update sub-series (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const data = {};

    if (name) {
      data.name = name;
      data.slug = slugify(name, { lower: true, strict: true });
    }

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const subSeries = await prisma.subSeries.update({
      where: { id },
      data,
    });

    res.json(subSeries);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Sub-series not found' });
    }
    logError('Error updating sub-series', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/subseries/:id — delete sub-series (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    await prisma.subSeries.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Sub-series not found' });
    }
    logError('Error deleting sub-series', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
