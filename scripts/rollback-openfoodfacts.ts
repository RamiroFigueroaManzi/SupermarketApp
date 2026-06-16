/**
 * Elimina todos los productos importados desde Open Food Facts.
 * Solo afecta productos con ID que empieza con "off-".
 *
 * Uso:
 *   npx tsx scripts/rollback-openfoodfacts.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const count = await db.product.count({ where: { id: { startsWith: "off-" } } });

  if (count === 0) {
    console.log("ℹ️  No hay productos de Open Food Facts para eliminar.");
    return;
  }

  console.log(`🗑️  Se van a eliminar ${count} productos importados desde Open Food Facts.`);
  console.log("   (Los productos creados manualmente desde el admin NO se tocan)\n");

  const { count: deleted } = await db.product.deleteMany({
    where: { id: { startsWith: "off-" } },
  });

  console.log(`✅ ${deleted} productos eliminados.`);
}

main()
  .catch((e) => { console.error("❌", e.message); process.exit(1); })
  .finally(() => db.$disconnect());
