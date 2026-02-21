/**
 * Data migration: Convert per-user owned figures/accessories to
 * shared catalog with UserFigure/UserAccessory tracking tables.
 *
 * Run AFTER the Prisma migrations that add UserFigure/UserAccessory
 * and remove owned/userId columns from Figure/Accessory.
 *
 * Usage: node server/prisma/migrate-to-catalog.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // We need raw queries since the old columns may already be gone
  // after the migration. This script should be run BETWEEN the two
  // migrations (after adding new tables, before dropping old columns).
  //
  // If columns are already dropped, this is a no-op.

  console.log('Starting catalog migration...');

  // Check if the old columns still exist by trying a raw query
  let figures;
  try {
    figures = await prisma.$queryRaw`
      SELECT id, owned, userId FROM Figure WHERE owned = 1
    `;
  } catch (err) {
    console.log('Old columns already removed or no owned figures found. Migration may have already run.');
    figures = [];
  }

  // Migrate owned figures to UserFigure
  let figureCount = 0;
  for (const fig of figures) {
    try {
      await prisma.userFigure.create({
        data: {
          userId: fig.userId,
          figureId: fig.id,
        },
      });
      figureCount++;
    } catch (err) {
      // Skip duplicates (P2002)
      if (err.code !== 'P2002') {
        console.error(`Error migrating figure ${fig.id}:`, err.message);
      }
    }
  }
  console.log(`Migrated ${figureCount} owned figures to UserFigure`);

  // Migrate owned accessories to UserAccessory
  let accessories;
  try {
    accessories = await prisma.$queryRaw`
      SELECT a.id as accessoryId, f.userId
      FROM Accessory a
      JOIN Figure f ON a.figureId = f.id
      WHERE a.owned = 1
    `;
  } catch (err) {
    console.log('Old accessory columns already removed. Skipping accessory migration.');
    accessories = [];
  }

  let accCount = 0;
  for (const acc of accessories) {
    try {
      // Also ensure the figure is in the user's collection
      await prisma.userFigure.upsert({
        where: {
          userId_figureId: {
            userId: acc.userId,
            figureId: acc.figureId,
          },
        },
        update: {},
        create: {
          userId: acc.userId,
          figureId: acc.figureId,
        },
      });

      await prisma.userAccessory.create({
        data: {
          userId: acc.userId,
          accessoryId: acc.accessoryId,
        },
      });
      accCount++;
    } catch (err) {
      if (err.code !== 'P2002') {
        console.error(`Error migrating accessory ${acc.accessoryId}:`, err.message);
      }
    }
  }
  console.log(`Migrated ${accCount} owned accessories to UserAccessory`);

  // Promote admin photos to catalog photos (set userId = null)
  const adminPhotos = await prisma.$queryRaw`
    SELECT p.id FROM Photo p
    JOIN User u ON p.userId = u.id
    WHERE u.role = 'ADMIN'
  `;

  if (adminPhotos.length > 0) {
    const ids = adminPhotos.map((p) => p.id);
    await prisma.photo.updateMany({
      where: { id: { in: ids } },
      data: { userId: null },
    });
    console.log(`Promoted ${ids.length} admin photos to catalog photos`);
  }

  console.log('Migration complete!');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
