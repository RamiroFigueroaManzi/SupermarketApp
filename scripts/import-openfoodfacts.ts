/**
 * Importa productos reales desde Open Food Facts (openfoodfacts.org)
 * Filtra por país Argentina y mapea a las categorías del sistema.
 *
 * Uso:
 *   npx tsx scripts/import-openfoodfacts.ts
 *
 * Opciones de entorno:
 *   DRY_RUN=true   → solo muestra qué importaría, sin escribir en BD
 *   MAX_PER_CAT=30 → límite de productos por categoría (default: 30)
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const DRY_RUN = process.env.DRY_RUN === "true";
const MAX_PER_CAT = parseInt(process.env.MAX_PER_CAT || "30");

// ─── Mapeo de categorías OFF → nuestras categorías ────────────────────────────
// Cada entrada busca en la API de OFF con esa categoría y la inserta en la nuestra
const CATEGORY_SEARCHES: { offTag: string; ourCategory: string }[] = [
  { offTag: "en:beverages",           ourCategory: "Bebidas" },
  { offTag: "en:beers",               ourCategory: "Bebidas" },
  { offTag: "en:juices",              ourCategory: "Bebidas" },
  { offTag: "en:mineral-waters",      ourCategory: "Bebidas" },
  { offTag: "en:dairy-products",      ourCategory: "Lácteos" },
  { offTag: "en:milks",               ourCategory: "Lácteos" },
  { offTag: "en:yogurts",             ourCategory: "Lácteos" },
  { offTag: "en:cheeses",             ourCategory: "Lácteos" },
  { offTag: "en:meats",               ourCategory: "Carnes y Fiambres" },
  { offTag: "en:cold-cuts",           ourCategory: "Carnes y Fiambres" },
  { offTag: "en:breads",              ourCategory: "Panadería y Pastas" },
  { offTag: "en:pastas",              ourCategory: "Panadería y Pastas" },
  { offTag: "en:biscuits-and-cakes",  ourCategory: "Snacks y Golosinas" },
  { offTag: "en:chocolates",          ourCategory: "Snacks y Golosinas" },
  { offTag: "en:salty-snacks",        ourCategory: "Snacks y Golosinas" },
  { offTag: "en:frozen-foods",        ourCategory: "Congelados" },
  { offTag: "en:frozen-meals",        ourCategory: "Congelados" },
  { offTag: "en:cleaning-products",   ourCategory: "Limpieza y Hogar" },
  { offTag: "en:fruits",              ourCategory: "Frutas y Verduras" },
  { offTag: "en:vegetables",          ourCategory: "Frutas y Verduras" },
];

// ─── Precios ARS aproximados 2025 por categoría ───────────────────────────────
const PRICE_RANGES: Record<string, [number, number]> = {
  "Bebidas":            [800,  5500],
  "Lácteos":            [500,  4000],
  "Carnes y Fiambres":  [2000, 9000],
  "Panadería y Pastas": [400,  2500],
  "Snacks y Golosinas": [400,  2500],
  "Congelados":         [1200, 6000],
  "Limpieza y Hogar":   [500,  4500],
  "Frutas y Verduras":  [300,  2200],
};

function randomPrice(category: string): string {
  const [min, max] = PRICE_RANGES[category] ?? [500, 3000];
  const price = Math.floor(Math.random() * (max - min + 1) + min);
  // Termina en 0, 5 o 9 para verse como precio real
  const endings = [0, 5, 9, 99];
  const r = price - (price % 100) + endings[Math.floor(Math.random() * endings.length)];
  return r.toFixed(2);
}

// ─── Llamada a la API de Open Food Facts (con reintentos) ────────────────────
async function fetchProducts(offTag: string, page = 1, retries = 3): Promise<any[]> {
  const fields = "product_name,product_name_es,image_front_small_url,brands,categories_tags";
  const url =
    `https://world.openfoodfacts.org/cgi/search.pl` +
    `?action=process` +
    `&tagtype_0=countries&tag_contains_0=contains&tag_0=argentina` +
    `&tagtype_1=categories&tag_contains_1=contains&tag_1=${encodeURIComponent(offTag)}` +
    `&sort_by=popularity` +
    `&page_size=${MAX_PER_CAT}` +
    `&page=${page}` +
    `&json=1` +
    `&fields=${fields}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "SupermarketApp/1.0 (educational project)" },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 503 || res.status === 429) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        throw new Error(`OFF API error: ${res.status}`);
      }
      if (!res.ok) throw new Error(`OFF API error: ${res.status}`);
      const data = await res.json() as any;
      return data.products ?? [];
    } catch (err: any) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  return [];
}

// ─── Limpieza de nombre ────────────────────────────────────────────────────────
function cleanName(raw: string | undefined, brand: string | undefined): string | null {
  const name = (raw || "").trim();
  if (!name || name.length < 3 || name.length > 80) return null;
  // Quitar caracteres raros o nombres genéricos
  if (/^[0-9\-\.]+$/.test(name)) return null;
  // Agregar marca si no está incluida
  const br = (brand || "").split(",")[0].trim();
  if (br && !name.toLowerCase().includes(br.toLowerCase())) {
    return `${br} ${name}`.slice(0, 80).trim();
  }
  return name;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌎 Importando desde Open Food Facts${DRY_RUN ? " (DRY RUN)" : ""}...`);
  console.log(`   Máximo ${MAX_PER_CAT} productos por categoría\n`);

  // Cargar categorías existentes
  const cats = await db.category.findMany();
  const catMap: Record<string, string> = {};
  for (const c of cats) catMap[c.name] = c.id;

  // Verificar que todas las categorías necesarias existan
  const missingCats = [...new Set(CATEGORY_SEARCHES.map((s) => s.ourCategory))].filter(
    (c) => !catMap[c]
  );
  if (missingCats.length > 0) {
    console.error("❌ Categorías no encontradas en BD:", missingCats.join(", "));
    console.error("   Ejecutá primero: npx tsx prisma/seed.ts");
    process.exit(1);
  }

  let totalImported = 0;
  let totalSkipped = 0;
  const seen = new Set<string>(); // nombres ya procesados para evitar duplicados

  for (const { offTag, ourCategory } of CATEGORY_SEARCHES) {
    process.stdout.write(`📦 ${ourCategory.padEnd(22)} (${offTag}) ... `);

    let products: any[] = [];
    try {
      products = await fetchProducts(offTag);
    } catch (err: any) {
      console.log(`⚠️  Error: ${err.message}`);
      continue;
    }

    let catImported = 0;
    for (const p of products) {
      const rawName = p.product_name_es || p.product_name;
      const name = cleanName(rawName, p.brands);
      if (!name || seen.has(name.toLowerCase())) { totalSkipped++; continue; }
      seen.add(name.toLowerCase());

      const imageUrl = p.image_front_small_url || null;
      const price = randomPrice(ourCategory);
      const categoryId = catMap[ourCategory];

      if (!DRY_RUN) {
        // ID determinista para que upsert no duplique en re-ejecuciones
        const stableId = `off-${name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50)}`;
        await db.product.upsert({
          where: { id: stableId },
          update: { imageUrl, price: price as any },
          create: { id: stableId, name, price: price as any, categoryId, imageUrl },
        });
      }
      catImported++;
      totalImported++;
    }

    console.log(`${catImported} productos`);

    // Pausa entre requests para respetar la API pública
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log(`\n✅ Importación completada`);
  console.log(`   Importados : ${totalImported}`);
  console.log(`   Descartados: ${totalSkipped} (sin nombre, duplicados o nombre inválido)`);
  if (DRY_RUN) console.log("\n   ⚠️  DRY RUN — nada fue escrito en la BD");
}

main()
  .catch((e) => { console.error("\n❌", e.message); process.exit(1); })
  .finally(() => db.$disconnect());
