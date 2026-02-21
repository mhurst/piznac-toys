const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { parseId, logError } = require('../middleware/validate');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/figures — browse figures (paginated, filterable)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { toylineId, seriesId, tagIds, search, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (toylineId) where.toyLineId = parseInt(toylineId);
    if (seriesId) where.seriesId = parseInt(seriesId);
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (tagIds) {
      const ids = tagIds.split(',').map(Number);
      where.tags = { some: { tagId: { in: ids } } };
    }

    const include = {
      series: { select: { name: true } },
      toyLine: { select: { name: true, slug: true } },
      tags: { include: { tag: true } },
      photos: { where: { isPrimary: true }, take: 1 },
      accessories: true,
    };

    // Include user-specific collection data when logged in
    if (req.userId) {
      include.collectors = { where: { userId: req.userId } };
      include.accessories = {
        include: {
          userStatuses: { where: { userId: req.userId } },
        },
      };
    }

    const [figures, total] = await Promise.all([
      prisma.figure.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include,
      }),
      prisma.figure.count({ where }),
    ]);

    const mapped = figures.map((f) => ({
      ...f,
      tags: f.tags.map((ft) => ft.tag),
      primaryPhoto: f.photos[0] || null,
      accessoryCount: f.accessories.length,
      ownedAccessoryCount: req.userId
        ? f.accessories.filter((a) => a.userStatuses && a.userStatuses.length > 0).length
        : 0,
      inCollection: req.userId ? (f.collectors && f.collectors.length > 0) : false,
      collectors: undefined,
    }));

    res.json({
      figures: mapped,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / take),
    });
  } catch (err) {
    logError('Error fetching figures', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/figures/:id — figure detail
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const include = {
      series: true,
      toyLine: true,
      tags: { include: { tag: true } },
      accessories: { orderBy: { name: 'asc' } },
      photos: { orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }] },
    };

    // Include user-specific data when logged in
    if (req.userId) {
      include.collectors = { where: { userId: req.userId } };
      include.accessories = {
        orderBy: { name: 'asc' },
        include: {
          userStatuses: { where: { userId: req.userId } },
        },
      };
    }

    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const figure = await prisma.figure.findUnique({
      where: { id },
      include,
    });

    if (!figure) {
      return res.status(404).json({ error: 'Figure not found' });
    }

    const result = {
      ...figure,
      tags: figure.tags.map((ft) => ft.tag),
      inCollection: req.userId ? (figure.collectors && figure.collectors.length > 0) : false,
      forSale: req.userId ? (figure.collectors?.[0]?.forSale || false) : false,
      accessories: figure.accessories.map((a) => ({
        ...a,
        owned: req.userId && a.userStatuses ? a.userStatuses.length > 0 : false,
        forSale: req.userId && a.userStatuses ? (a.userStatuses[0]?.forSale || false) : false,
        userStatuses: undefined,
      })),
      collectors: undefined,
    };

    res.json(result);
  } catch (err) {
    logError('Error fetching figure', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/figures — create figure (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, year, notes, toyLineId, seriesId, tagIds } = req.body;

    if (!name || !toyLineId || !seriesId) {
      return res.status(400).json({ error: 'Name, toyLineId, and seriesId are required' });
    }

    const figure = await prisma.figure.create({
      data: {
        name,
        year: year ? parseInt(year) : null,
        notes: notes || null,
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
    logError('Error creating figure', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/figures/:id — update figure (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const existing = await prisma.figure.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Figure not found' });

    const { name, year, notes, toyLineId, seriesId, tagIds } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (year !== undefined) data.year = year ? parseInt(year) : null;
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
    logError('Error updating figure', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/figures/:id — delete figure (admin only, cascades)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const figure = await prisma.figure.findUnique({
      where: { id },
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

    await prisma.figure.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    logError('Error deleting figure', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/figures/:id/accessories — add accessory (admin only)
router.post('/:id/accessories', requireAuth, requireAdmin, async (req, res) => {
  try {
    const figureId = parseId(req.params.id);
    if (!figureId) return res.status(400).json({ error: 'Invalid ID' });
    const figure = await prisma.figure.findUnique({ where: { id: figureId } });
    if (!figure) return res.status(404).json({ error: 'Figure not found' });

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const accessory = await prisma.accessory.create({
      data: {
        name,
        figureId,
      },
    });

    res.status(201).json(accessory);
  } catch (err) {
    logError('Error creating accessory', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/accessories/:id — update accessory (admin only)
router.put('/accessories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const accessory = await prisma.accessory.findUnique({ where: { id } });
    if (!accessory) return res.status(404).json({ error: 'Accessory not found' });

    const { name } = req.body;
    const data = {};

    if (name !== undefined) data.name = name;

    const updated = await prisma.accessory.update({
      where: { id },
      data,
    });

    res.json(updated);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Accessory not found' });
    }
    logError('Error updating accessory', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/accessories/:id — delete accessory (admin only)
router.delete('/accessories/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid ID' });

    const accessory = await prisma.accessory.findUnique({ where: { id } });
    if (!accessory) return res.status(404).json({ error: 'Accessory not found' });

    await prisma.accessory.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Accessory not found' });
    }
    logError('Error deleting accessory', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
