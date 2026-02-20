const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/figures — browse figures (paginated, filterable)
router.get('/', async (req, res) => {
  try {
    const { toylineId, seriesId, tagIds, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (toylineId) where.toyLineId = parseInt(toylineId);
    if (seriesId) where.seriesId = parseInt(seriesId);
    if (search) {
      where.name = { contains: search };
    }
    if (tagIds) {
      const ids = tagIds.split(',').map(Number);
      where.tags = { some: { tagId: { in: ids } } };
    }

    const [figures, total] = await Promise.all([
      prisma.figure.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          series: { select: { name: true } },
          toyLine: { select: { name: true, slug: true } },
          tags: { include: { tag: true } },
          photos: { where: { isPrimary: true }, take: 1 },
          accessories: true,
        },
      }),
      prisma.figure.count({ where }),
    ]);

    const mapped = figures.map((f) => ({
      ...f,
      tags: f.tags.map((ft) => ft.tag),
      primaryPhoto: f.photos[0] || null,
      accessoryCount: f.accessories.length,
      ownedAccessoryCount: f.accessories.filter((a) => a.owned).length,
    }));

    res.json({
      figures: mapped,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    });
  } catch (err) {
    console.error('Error fetching figures:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/figures/:id — figure detail
router.get('/:id', async (req, res) => {
  try {
    const figure = await prisma.figure.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        series: true,
        toyLine: true,
        tags: { include: { tag: true } },
        accessories: { orderBy: { name: 'asc' } },
        photos: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
      },
    });

    if (!figure) {
      return res.status(404).json({ error: 'Figure not found' });
    }

    res.json({
      ...figure,
      tags: figure.tags.map((ft) => ft.tag),
    });
  } catch (err) {
    console.error('Error fetching figure:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/figures — create figure (admin)
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, year, notes, owned, toyLineId, seriesId, tagIds } = req.body;

    if (!name || !toyLineId || !seriesId) {
      return res.status(400).json({ error: 'Name, toyLineId, and seriesId are required' });
    }

    const figure = await prisma.figure.create({
      data: {
        name,
        year: year ? parseInt(year) : null,
        notes: notes || null,
        owned: owned || false,
        toyLineId: parseInt(toyLineId),
        seriesId: parseInt(seriesId),
        tags: tagIds && tagIds.length > 0
          ? { create: tagIds.map((tagId) => ({ tagId: parseInt(tagId) })) }
          : undefined,
      },
      include: {
        series: true,
        toyLine: true,
        tags: { include: { tag: true } },
        accessories: true,
        photos: true,
      },
    });

    res.status(201).json({
      ...figure,
      tags: figure.tags.map((ft) => ft.tag),
    });
  } catch (err) {
    console.error('Error creating figure:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/figures/:id — update figure (admin)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, year, notes, owned, toyLineId, seriesId, tagIds } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (year !== undefined) data.year = year ? parseInt(year) : null;
    if (owned !== undefined) data.owned = owned;
    if (notes !== undefined) data.notes = notes;
    if (toyLineId !== undefined) data.toyLineId = parseInt(toyLineId);
    if (seriesId !== undefined) data.seriesId = parseInt(seriesId);

    // Update tags: delete existing, create new
    if (tagIds !== undefined) {
      await prisma.figureTag.deleteMany({ where: { figureId: id } });
      if (tagIds.length > 0) {
        await prisma.figureTag.createMany({
          data: tagIds.map((tagId) => ({ figureId: id, tagId: parseInt(tagId) })),
        });
      }
    }

    const figure = await prisma.figure.update({
      where: { id },
      data,
      include: {
        series: true,
        toyLine: true,
        tags: { include: { tag: true } },
        accessories: true,
        photos: true,
      },
    });

    res.json({
      ...figure,
      tags: figure.tags.map((ft) => ft.tag),
    });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Figure not found' });
    }
    console.error('Error updating figure:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/figures/:id — delete figure (admin, cascades)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Get photos to delete files
    const figure = await prisma.figure.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { photos: true },
    });

    if (!figure) {
      return res.status(404).json({ error: 'Figure not found' });
    }

    // Delete photo files
    const fs = require('fs');
    const path = require('path');
    for (const photo of figure.photos) {
      const filePath = path.join(__dirname, '..', 'uploads', photo.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.figure.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting figure:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/figures/:id/accessories — add accessory (admin)
router.post('/:id/accessories', requireAuth, async (req, res) => {
  try {
    const { name, owned } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const accessory = await prisma.accessory.create({
      data: {
        name,
        owned: owned || false,
        figureId: parseInt(req.params.id),
      },
    });

    res.status(201).json(accessory);
  } catch (err) {
    console.error('Error creating accessory:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/accessories/:id — update accessory (admin)
router.put('/accessories/:id', requireAuth, async (req, res) => {
  try {
    const { name, owned } = req.body;
    const data = {};

    if (name !== undefined) data.name = name;
    if (owned !== undefined) data.owned = owned;

    const accessory = await prisma.accessory.update({
      where: { id: parseInt(req.params.id) },
      data,
    });

    res.json(accessory);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Accessory not found' });
    }
    console.error('Error updating accessory:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/accessories/:id — delete accessory (admin)
router.delete('/accessories/:id', requireAuth, async (req, res) => {
  try {
    await prisma.accessory.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Accessory not found' });
    }
    console.error('Error deleting accessory:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
