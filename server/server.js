const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const toylineRoutes = require('./routes/toylines');
const seriesRoutes = require('./routes/series');
const tagRoutes = require('./routes/tags');
const figureRoutes = require('./routes/figures');
const photoRoutes = require('./routes/photos');

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

// Stats route
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
app.get('/api/stats', async (req, res) => {
  try {
    const [totalFigures, totalToylines, totalAccessories, ownedAccessories] = await Promise.all([
      prisma.figure.count(),
      prisma.toyLine.count(),
      prisma.accessory.count(),
      prisma.accessory.count({ where: { owned: true } }),
    ]);
    res.json({
      totalFigures,
      totalToylines,
      totalAccessories,
      ownedAccessories,
      completionPercent: totalAccessories > 0
        ? Math.round((ownedAccessories / totalAccessories) * 100)
        : 0,
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
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
