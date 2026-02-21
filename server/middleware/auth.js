const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const JWT_SECRET = process.env.JWT_SECRET;
const prisma = new PrismaClient();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/',
};

function getToken(req) {
  // Prefer httpOnly cookie, fall back to Authorization header for API clients
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

async function requireAuth(req, res, next) {
  const token = getToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!user.active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }
    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

function requireAdmin(req, res, next) {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

async function optionalAuth(req, res, next) {
  const token = getToken(req);

  if (!token) {
    req.userId = null;
    req.userRole = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (user && user.active) {
      req.userId = user.id;
      req.userRole = user.role;
    } else {
      req.userId = null;
      req.userRole = null;
    }
  } catch (err) {
    req.userId = null;
    req.userRole = null;
  }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth, JWT_SECRET, COOKIE_OPTIONS };
