# Piznac Toys

Vintage toy collection catalog app for browsing and managing action figures, toylines, series, accessories, and photos.

## Architecture

- **Monorepo** with `server/` (Express API) and `client/` (Angular SPA)
- **Database**: SQLite via Prisma ORM (`server/prisma/schema.prisma`)
- **Auth**: JWT-based admin authentication (`server/middleware/auth.js`)
- **File uploads**: Multer + Sharp for photo processing (`server/uploads/`)

## Tech Stack

### Server (`server/`)
- Express 5, Node.js (CommonJS `require`)
- Prisma 6 with SQLite (`server/prisma/dev.db`)
- bcrypt for password hashing, jsonwebtoken for JWT
- multer for file uploads, sharp for image processing
- slugify for URL-friendly slugs

### Client (`client/`)
- Angular (standalone components, lazy-loaded routes)
- SCSS styling
- Tests skipped in schematics config (skipTests: true)
- Proxy config for dev: `proxy.conf.json`

## Project Structure

```
package.json              # Root — concurrently runs server + client
server/
  server.js               # Express app entry point (port 3000)
  middleware/auth.js       # JWT requireAuth middleware
  routes/
    auth.js               # POST login/register
    toylines.js           # CRUD toylines
    series.js             # CRUD series (scoped to toyline)
    tags.js               # CRUD tags (scoped to toyline)
    figures.js            # CRUD figures
    photos.js             # Photo upload/management
  prisma/
    schema.prisma         # Data models
    seed.js               # Database seeder
    dev.db                # SQLite database (gitignored)
  uploads/                # Uploaded photos (gitignored except .gitkeep)
client/
  src/app/
    app.routes.ts         # Route definitions
    app.component.ts      # Root component
    core/
      auth.service.ts     # Auth state management
      auth.guard.ts       # Route guard for admin
      auth.interceptor.ts # Adds JWT to API requests
      api.service.ts      # HTTP client for API calls
    public/               # Public-facing pages
      home/               # Landing page
      browse/             # Browse toyline by slug
      figure-detail/      # Individual figure view
    admin/                # Auth-protected admin pages
      login/
      dashboard/
      manage-toylines/
      figure-list/
      figure-form/        # Create/edit figure (shared component)
      profile/
```

## Data Models (Prisma)

- **Admin** — email/password for auth
- **ToyLine** — top-level grouping (name, slug, coverImage)
- **Series** — subdivision of a toyline (unique per toyline by slug)
- **Tag** — labels scoped to a toyline
- **Figure** — belongs to toyline + series, has tags/accessories/photos
- **Accessory** — belongs to a figure, tracks owned status
- **Photo** — image file for a figure, one can be primary

## Commands

```bash
npm run dev              # Run both server + client concurrently
npm run dev:server       # Server only (nodemon)
npm run dev:client       # Angular dev server with proxy

# Server-specific (run from server/)
npm run seed             # Seed database
npm run migrate          # Prisma migrate dev
npm run studio           # Prisma Studio GUI
```

## Conventions

- Server routes use `requireAuth` middleware for admin-only endpoints
- Slugs generated via `slugify(name, { lower: true, strict: true })`
- Prisma error codes: P2002 = unique constraint, P2025 = not found
- API prefix: `/api/` — all routes mounted under this
- Angular uses standalone components with lazy loading
- Production: Angular build served as static files from Express
