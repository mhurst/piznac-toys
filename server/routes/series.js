const express = require('express');
const { PrismaClient } = require('@prisma/client');
const slugify = require('slugify');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/series — create series (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, toyLineId } = req.body;

    if (!name || !toyLineId) {
      return res.status(400).json({ error: 'Name and toyLineId are required' });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const series = await prisma.series.create({
      data: { name, slug, toyLineId: parseInt(toyLineId) },
    });

    res.status(201).json(series);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Series already exists in this toyline' });
    }
    console.error('Error creating series:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/series/:id — update series (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const data = {};

    if (name) {
      data.name = name;
      data.slug = slugify(name, { lower: true, strict: true });
    }

    const series = await prisma.series.update({
      where: { id: parseInt(req.params.id) },
      data,
    });

    res.json(series);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Series not found' });
    }
    console.error('Error updating series:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/series/:id — delete series (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.series.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Series not found' });
    }
    console.error('Error deleting series:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
