const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const toylineRoutes = require('./routes/toylines');
const seriesRoutes = require('./routes/series');
const tagRoutes = require('./routes/tags');
const figureRoutes = require('./routes/figures');
const photoRoutes = require('./routes/photos');
const userRoutes = require('./routes/users');
const collectionRoutes = require('./routes/collection');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/toylines', toylineRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/figures', figureRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/collection', collectionRoutes);

// Stats route
const { PrismaClient } = require('@prisma/client');
const { optionalAuth } = require('./middleware/auth');
const prisma = new PrismaClient();
app.get('/api/stats', optionalAuth, async (req, res) => {
  try {
    const [totalFigures, totalToylines, totalAccessories] = await Promise.all([
      prisma.figure.count(),
      prisma.toyLine.count(),
      prisma.accessory.count(),
    ]);

    const result = {
      totalFigures,
      totalToylines,
      totalAccessories,
      userStats: null,
    };

    if (req.userId) {
      const [ownedFigures, ownedAccessories] = await Promise.all([
        prisma.userFigure.count({ where: { userId: req.userId } }),
        prisma.userAccessory.count({ where: { userId: req.userId } }),
      ]);

      // Total accessories for figures in user's collection
      const totalCollectionAccessories = await prisma.accessory.count({
        where: {
          figure: {
            collectors: { some: { userId: req.userId } },
          },
        },
      });

      result.userStats = {
        ownedFigures,
        ownedAccessories,
        completionPercent: totalCollectionAccessories > 0
          ? Math.round((ownedAccessories / totalCollectionAccessories) * 100)
          : 0,
      };
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Temporary: file sync endpoint for migrating uploads (admin only)
const { requireAuth, requireAdmin } = require('./middleware/auth');
const multer = require('multer');
const fs = require('fs');
const syncUpload = multer({ dest: path.join(__dirname, 'uploads') });
app.post('/api/sync-upload', requireAuth, requireAdmin, syncUpload.single('file'), (req, res) => {
  if (!req.file || !req.body.filename) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'file and filename required' });
  }
  const dest = path.join(__dirname, 'uploads', req.body.filename);
  fs.renameSync(req.file.path, dest);
  res.json({ ok: true, filename: req.body.filename });
});

// Serve Angular app in production
const clientDist = path.join(__dirname, '..', 'client', 'dist', 'client', 'browser');
app.use(express.static(clientDist));
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Piznac Toys server running on port ${PORT}`);
});
