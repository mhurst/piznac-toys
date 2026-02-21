const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/tags — create tag (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, toyLineId } = req.body;

    if (!name || !toyLineId) {
      return res.status(400).json({ error: 'Name and toyLineId are required' });
    }

    const tag = await prisma.tag.create({
      data: { name, toyLineId: parseInt(toyLineId) },
    });

    res.status(201).json(tag);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Tag already exists in this toyline' });
    }
    console.error('Error creating tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tags/:id — update tag (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const tag = await prisma.tag.update({
      where: { id: parseInt(req.params.id) },
      data: { name },
    });

    res.json(tag);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tag not found' });
    }
    console.error('Error updating tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/tags/:id — delete tag (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.tag.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Tag not found' });
    }
    console.error('Error deleting tag:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
