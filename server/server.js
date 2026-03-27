require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set.');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const toylineRoutes = require('./routes/toylines');
const seriesRoutes = require('./routes/series');
const subSeriesRoutes = require('./routes/subseries');
const tagRoutes = require('./routes/tags');
const figureRoutes = require('./routes/figures');
const photoRoutes = require('./routes/photos');
const userRoutes = require('./routes/users');
const collectionRoutes = require('./routes/collection');
const priceRoutes = require('./routes/prices');

// Seed catalog images into uploads volume on startup
const catalogDir = path.join(__dirname, 'catalog-images');
const uploadsDir = path.join(__dirname, 'uploads');
if (fs.existsSync(catalogDir)) {
  const files = fs.readdirSync(catalogDir);
  let copied = 0;
  for (const f of files) {
    const dest = path.join(uploadsDir, f);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(catalogDir, f), dest);
      copied++;
    }
  }
  if (copied > 0) console.log(`Seeded ${copied} catalog images into uploads`);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Railway (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security headers via helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — in production, Angular is served from same origin so CORS isn't needed.
// In dev, the Angular proxy handles it. This config is a safety net.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:4200'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Serve uploaded photos with cache headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
  },
}));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/toylines', toylineRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/subseries', subSeriesRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/figures', figureRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/prices', priceRoutes);

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
    console.error('Error fetching stats:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sync-upload endpoint for pushing local images to production
const multer = require('multer');
const { requireAuth, requireAdmin } = require('./middleware/auth');
const syncUpload = multer({ dest: path.join(__dirname, 'uploads', 'tmp') });
app.post('/api/sync-upload', requireAuth, requireAdmin, syncUpload.single('file'), (req, res) => {
  if (!req.file || !req.body.filename) {
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
