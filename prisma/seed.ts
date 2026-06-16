/**
 * Seed con productos populares en supermercados argentinos.
 * Las imágenes se buscan automáticamente en Open Food Facts.
 *
 * Uso:  npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

// ─── Productos curados ────────────────────────────────────────────────────────
// Formato: [nombre, categoría, precio ARS, descripción?]
const PRODUCTS: [string, string, number, string?][] = [
  // ── Bebidas ──────────────────────────────────────────────────────────────
  ["Coca-Cola 2.25L",             "Bebidas",            2850, "Gaseosa cola familiar"],
  ["Coca-Cola 600ml",             "Bebidas",            1250, "Gaseosa cola personal"],
  ["Coca-Cola Zero 2.25L",        "Bebidas",            2950, "Gaseosa cola sin azúcar"],
  ["Pepsi 2.25L",                 "Bebidas",            2650, "Gaseosa cola familiar"],
  ["Sprite 2.25L",                "Bebidas",            2750, "Gaseosa lima-limón"],
  ["Fanta Naranja 2.25L",         "Bebidas",            2700, "Gaseosa sabor naranja"],
  ["7UP 2.25L",                   "Bebidas",            2650, "Gaseosa lima-limón sin cafeína"],
  ["Manaos Cola 2.25L",           "Bebidas",            1490, "Gaseosa cola económica"],
  ["Cunnington Cola 2L",          "Bebidas",            1290, "Gaseosa cola económica"],
  ["Agua Villavicencio 2L",       "Bebidas",            1150, "Agua mineral natural"],
  ["Agua Glaciar 1.5L",           "Bebidas",            980,  "Agua mineral sin gas"],
  ["Ser Manzana 1L",              "Bebidas",            1450, "Jugo sabor manzana con pulpa"],
  ["Cepita Naranja 1L",           "Bebidas",            1550, "Jugo de naranja exprimido"],
  ["Ades Manzana 1L",             "Bebidas",            1680, "Bebida de soja sabor manzana"],
  ["Levité Pomelo 1.5L",          "Bebidas",            1850, "Agua saborizada pomelo"],
  ["Quilmes Lata 473ml",          "Bebidas",            1290, "Cerveza rubia lata"],
  ["Quilmes Botella 1L",          "Bebidas",            2450, "Cerveza rubia retornable"],
  ["Brahma Lata 473ml",           "Bebidas",            1250, "Cerveza rubia lata"],
  ["Stella Artois 473ml",         "Bebidas",            1650, "Cerveza belga premium lata"],
  ["Isenbeck Lata 473ml",         "Bebidas",            1190, "Cerveza rubia lata"],
  ["Vino Toro Tinto 750ml",       "Bebidas",            2990, "Vino tinto de mesa"],
  ["Vino Gato Negro Malbec 750ml","Bebidas",            5500, "Vino Malbec chileno"],
  ["Nescafé Clásico 170g",        "Bebidas",            5200, "Café instantáneo clásico"],
  ["Té Lipton x20 saquitos",      "Bebidas",            1890, "Té negro en saquitos"],
  ["Maté Cruz de Malta 500g",     "Bebidas",            3200, "Yerba mate con palo"],
  ["Taragüi 500g",                "Bebidas",            2950, "Yerba mate con palo"],
  ["CBSé 500g",                   "Bebidas",            2750, "Yerba mate con hierbas"],

  // ── Lácteos ──────────────────────────────────────────────────────────────
  ["La Serenísima Entera 1L",         "Lácteos", 1250, "Leche entera fresca"],
  ["La Serenísima Descremada 1L",     "Lácteos", 1290, "Leche descremada fresca"],
  ["Sancor Entera 1L",                "Lácteos", 1190, "Leche entera larga vida"],
  ["La Serenísima Larga Vida 1L",     "Lácteos", 1350, "Leche entera larga vida"],
  ["Yogur Ser Frutilla x4 x100g",     "Lácteos", 2200, "Yogur firme sabor frutilla"],
  ["Yogur Actimel Frutilla x4",       "Lácteos", 3200, "Leche fermentada con probióticos"],
  ["Queso Cremoso Ilolay 400g",       "Lácteos", 4800, "Queso cremoso para untar"],
  ["Queso Mozzarella La Paulina 400g","Lácteos", 5200, "Queso mozzarella rallado"],
  ["Queso Reggianito Tregar 200g",    "Lácteos", 3900, "Queso duro para rallar"],
  ["Manteca La Serenísima 200g",      "Lácteos", 2650, "Manteca sin sal"],
  ["Crema La Serenísima 200g",        "Lácteos", 1980, "Crema de leche entera"],
  ["Dulce de Leche Milkaut 400g",     "Lácteos", 2850, "Dulce de leche repostero"],
  ["Dulce de Leche La Serenísima 400g","Lácteos",2950, "Dulce de leche clásico"],
  ["Ricotta Casancrem 250g",          "Lácteos", 2100, "Ricotta cremosa"],
  ["Cheddar Tregar Feteado 150g",     "Lácteos", 3200, "Queso cheddar feteado"],

  // ── Carnes y Fiambres ─────────────────────────────────────────────────────
  ["Pechuga de Pollo Sin Hueso x kg", "Carnes y Fiambres", 6500, "Pechuga sin hueso fresca"],
  ["Muslo de Pollo x kg",             "Carnes y Fiambres", 4200, "Muslo de pollo fresco"],
  ["Carne Picada Común x kg",         "Carnes y Fiambres", 6800, "Carne picada especial"],
  ["Asado x kg",                      "Carnes y Fiambres", 9500, "Tira de asado vacuna"],
  ["Milanesa de Ternera x kg",        "Carnes y Fiambres", 8200, "Milanesa ternera lista"],
  ["Jamón Cocido Fargo 150g",         "Carnes y Fiambres", 2800, "Jamón cocido feteado"],
  ["Jamón Crudo Paladini 100g",       "Carnes y Fiambres", 3500, "Jamón crudo feteado"],
  ["Salame Tres Cruces 200g",         "Carnes y Fiambres", 4200, "Salame tipo Milán"],
  ["Mortadela La Salamandra 200g",    "Carnes y Fiambres", 2900, "Mortadela con aceitunas"],
  ["Salchichas Viena Paladini x6",    "Carnes y Fiambres", 2400, "Salchichas tipo Viena"],
  ["Chorizo Colorado Paladini x4",    "Carnes y Fiambres", 3200, "Chorizo colorado para parrilla"],

  // ── Panadería y Pastas ────────────────────────────────────────────────────
  ["Pan Lactal Bimbo 500g",           "Panadería y Pastas", 1850, "Pan de molde blanco"],
  ["Pan Lactal Fargo 490g",           "Panadería y Pastas", 1790, "Pan de molde blanco clásico"],
  ["Pan Lactal Integral Bimbo 500g",  "Panadería y Pastas", 2100, "Pan de molde integral"],
  ["Fideos Spaghetti Lucchetti 500g", "Panadería y Pastas", 1250, "Fideos spaghetti de sémola"],
  ["Fideos Mostachol Matarazzo 500g", "Panadería y Pastas", 1190, "Fideos mostachol de sémola"],
  ["Fideos Tirabuzón Don Felipe 500g","Panadería y Pastas", 1150, "Fideos tirabuzón"],
  ["Arroz Largo Fino Gallo 1kg",      "Panadería y Pastas", 2100, "Arroz largo fino"],
  ["Arroz Molinos Ala 1kg",           "Panadería y Pastas", 1980, "Arroz largo fino"],
  ["Harina Blancaflor 1kg",           "Panadería y Pastas", 1450, "Harina 0000 para repostería"],
  ["Harina Pureza 000 1kg",           "Panadería y Pastas", 1380, "Harina 000 para pan"],
  ["Polenta Nº5 Lucchetti 500g",      "Panadería y Pastas", 1290, "Polenta de cocción rápida"],
  ["Lentejas La Campagnola 400g",     "Panadería y Pastas", 1650, "Lentejas cocidas en lata"],
  ["Garbanzos La Campagnola 400g",    "Panadería y Pastas", 1720, "Garbanzos cocidos en lata"],
  ["Puré de Tomate Arcor 520g",       "Panadería y Pastas", 1190, "Puré de tomate natural"],
  ["Salsa de Tomate Arcor 350g",      "Panadería y Pastas", 1050, "Salsa de tomate lista"],

  // ── Snacks y Golosinas ────────────────────────────────────────────────────
  ["Oreo Original 117g",              "Snacks y Golosinas", 1890, "Galletitas con crema"],
  ["Toddy Original 126g",             "Snacks y Golosinas", 1750, "Galletitas de chocolate"],
  ["Pepitos 100g",                    "Snacks y Golosinas", 1450, "Galletitas de chocolate Bagley"],
  ["Maná 117g",                       "Snacks y Golosinas", 1350, "Galletitas de coco"],
  ["Oblea Bañada Portezuelo 25g",     "Snacks y Golosinas", 450,  "Oblea de chocolate individual"],
  ["Alfajor Jorgito Chocolate",       "Snacks y Golosinas", 750,  "Alfajor de chocolate con dulce de leche"],
  ["Alfajor Havanna x2",              "Snacks y Golosinas", 3800, "Alfajores de maicena bañados"],
  ["Alfajor Milka Mousse",            "Snacks y Golosinas", 1250, "Alfajor de chocolate Milka"],
  ["Bon o Bon Bolsa 120g",            "Snacks y Golosinas", 2200, "Bombones de maní"],
  ["Milka Chocolate Oreo 135g",       "Snacks y Golosinas", 2800, "Tableta de chocolate con Oreo"],
  ["Kit Kat 4 barras 41.5g",          "Snacks y Golosinas", 1650, "Barras de chocolate con wafer"],
  ["Rocklets Tubo 160g",              "Snacks y Golosinas", 2100, "Lentejas de chocolate"],
  ["Papas Lays Classic 145g",         "Snacks y Golosinas", 2450, "Papas fritas sabor clásico"],
  ["Papas Pringles Original 124g",    "Snacks y Golosinas", 2900, "Papas apiladas sabor original"],
  ["Doritos Queso 155g",              "Snacks y Golosinas", 2600, "Nachos sabor queso"],
  ["Cheetos 108g",                    "Snacks y Golosinas", 2100, "Bocaditos de maíz queso"],
  ["Palitos Salados Panchitos 200g",  "Snacks y Golosinas", 1650, "Palitos de maíz salados"],
  ["Chicle Beldent Menta 12u",        "Snacks y Golosinas", 1100, "Chicles sabor menta"],

  // ── Congelados ────────────────────────────────────────────────────────────
  ["Milanesas de Pollo Granja del Sol x6","Congelados", 4800, "Milanesas de pollo rebozadas"],
  ["Nuggets Pollo Granja del Sol x12",    "Congelados", 3900, "Nuggets de pollo"],
  ["Pizza Mozzarella Mc Master",          "Congelados", 4500, "Pizza congelada mozzarella"],
  ["Pizza Napolitana Mc Master",          "Congelados", 4800, "Pizza congelada napolitana"],
  ["Empanadas Carne Granja del Sol x12",  "Congelados", 5200, "Empanadas de carne al horno"],
  ["Hamburguesas Paty x4 480g",           "Congelados", 4200, "Hamburguesas de carne vacuna"],
  ["Helado Frigor Vainilla 1L",           "Congelados", 3800, "Helado crema vainilla"],
  ["Helado Frigor Chocolate 1L",          "Congelados", 3800, "Helado crema chocolate"],
  ["Espinaca Congelada Granja 300g",      "Congelados", 1950, "Espinaca congelada lista"],
  ["Bastones de Papa McCain 500g",        "Congelados", 3500, "Bastones de papa para horno"],

  // ── Limpieza y Hogar ──────────────────────────────────────────────────────
  ["Detergente Magistral Limón 500ml",    "Limpieza y Hogar", 1650, "Detergente lavavajillas limón"],
  ["Detergente Magistral 750ml",          "Limpieza y Hogar", 2100, "Detergente lavavajillas clásico"],
  ["Lavandina Ayudín 1L",                 "Limpieza y Hogar", 1290, "Lavandina concentrada"],
  ["Lavandina Ayudín 2L",                 "Limpieza y Hogar", 2100, "Lavandina concentrada 2L"],
  ["Jabón en Polvo Ariel 800g",           "Limpieza y Hogar", 5800, "Detergente ropa aroma fresco"],
  ["Jabón en Polvo Skip 800g",            "Limpieza y Hogar", 5200, "Detergente ropa activo"],
  ["Suavizante Downy 800ml",              "Limpieza y Hogar", 4200, "Suavizante ropa primaveral"],
  ["Limpiador Cif Crema 500g",            "Limpieza y Hogar", 2800, "Limpiador cremoso multiuso"],
  ["Limpiador Blem Muebles 200ml",        "Limpieza y Hogar", 2100, "Lustramuebles spray"],
  ["Papel Higiénico Elite x4 doble hoja","Limpieza y Hogar", 2900, "Papel higiénico doble hoja"],
  ["Papel Higiénico Higienol x8",         "Limpieza y Hogar", 3800, "Papel higiénico suave"],
  ["Servilletas Familia x100",            "Limpieza y Hogar", 1450, "Servilletas de papel"],
  ["Rollo de Cocina Mantelí x2",          "Limpieza y Hogar", 2200, "Rollo absorbente de cocina"],
  ["Repasador Vileda Multiuso",           "Limpieza y Hogar", 3500, "Trapo de piso multiuso"],
  ["Esponja Scotch-Brite Verde",          "Limpieza y Hogar", 1100, "Esponja doble función"],
  ["Shampoo Head & Shoulders 375ml",      "Limpieza y Hogar", 5800, "Shampoo anticaspa"],
  ["Desodorante Axe Apollo 150ml",        "Limpieza y Hogar", 3900, "Desodorante aerosol hombre"],
  ["Jabón Dove Original 90g",             "Limpieza y Hogar", 1450, "Jabón en barra hidratante"],

  // ── Frutas y Verduras ─────────────────────────────────────────────────────
  ["Banana x kg",               "Frutas y Verduras", 1200, "Banana de primera calidad"],
  ["Manzana Roja x kg",         "Frutas y Verduras", 1800, "Manzana roja importada"],
  ["Manzana Verde x kg",        "Frutas y Verduras", 1950, "Manzana verde Granny Smith"],
  ["Naranja x kg",              "Frutas y Verduras", 1100, "Naranja de jugo"],
  ["Mandarina x kg",            "Frutas y Verduras", 1400, "Mandarina sin semillas"],
  ["Pera x kg",                 "Frutas y Verduras", 2100, "Pera Williams"],
  ["Durazno x kg",              "Frutas y Verduras", 2500, "Durazno de estación"],
  ["Frutilla x 250g",           "Frutas y Verduras", 1800, "Frutilla fresca"],
  ["Uva x kg",                  "Frutas y Verduras", 3200, "Uva blanca sin semillas"],
  ["Papa Blanca x kg",          "Frutas y Verduras", 1050, "Papa blanca suelta"],
  ["Cebolla x kg",              "Frutas y Verduras", 950,  "Cebolla blanca"],
  ["Tomate Perita x kg",        "Frutas y Verduras", 1800, "Tomate perita para salsa"],
  ["Tomate Redondo x kg",       "Frutas y Verduras", 2100, "Tomate redondo para ensalada"],
  ["Lechuga Capuchina",         "Frutas y Verduras", 1200, "Lechuga fresca entera"],
  ["Zanahoria x kg",            "Frutas y Verduras", 900,  "Zanahoria fresca"],
  ["Zapallo Anco x kg",         "Frutas y Verduras", 1100, "Zapallo anco para puré"],
  ["Brócoli",                   "Frutas y Verduras", 1800, "Brócoli fresco"],
  ["Pimiento Rojo",             "Frutas y Verduras", 2200, "Pimiento morrón rojo"],
  ["Pepino",                    "Frutas y Verduras", 1500, "Pepino fresco"],
  ["Apio",                      "Frutas y Verduras", 1200, "Apio fresco en rama"],
];

// ─── Busca imagen en Open Food Facts ─────────────────────────────────────────
async function findImage(productName: string, retries = 2): Promise<string | null> {
  const query = productName
    .replace(/\d+(g|ml|kg|L|u|x\d+)/gi, "")
    .replace(/\bx\s*\d+\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url =
        `https://world.openfoodfacts.org/cgi/search.pl` +
        `?action=process` +
        `&search_terms=${encodeURIComponent(query)}` +
        `&json=1&page_size=1` +
        `&fields=image_front_small_url`;

      const res = await fetch(url, {
        headers: { "User-Agent": "SupermarketApp/1.0 (seed script - educational)" },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        if ((res.status === 503 || res.status === 429) && attempt < retries) {
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        return null;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("json")) return null;

      const data = await res.json() as any;
      return data.products?.[0]?.image_front_small_url || null;
    } catch {
      if (attempt < retries) await new Promise((r) => setTimeout(r, 1500));
      else return null;
    }
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding base de datos...\n");

  // ── Categorías ──────────────────────────────────────────────────────────
  const categoryNames = [
    "Frutas y Verduras", "Lácteos", "Bebidas", "Carnes y Fiambres",
    "Panadería y Pastas", "Limpieza y Hogar", "Congelados", "Snacks y Golosinas",
  ];
  const catMap: Record<string, string> = {};
  for (const name of categoryNames) {
    const cat = await db.category.upsert({ where: { name }, update: {}, create: { name } });
    catMap[name] = cat.id;
  }
  console.log(`✅ ${categoryNames.length} categorías listas`);

  // ── Productos con imágenes ───────────────────────────────────────────────
  console.log(`\n📦 Insertando ${PRODUCTS.length} productos (buscando imágenes en Open Food Facts)...\n`);

  let withImage = 0;
  let withoutImage = 0;

  for (const [name, category, price, description] of PRODUCTS) {
    const stableId = `seed-${name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 60)}`;
    const categoryId = catMap[category];

    process.stdout.write(`  ${name.slice(0, 50).padEnd(52)}`);

    const imageUrl = await findImage(name);
    if (imageUrl) { withImage++; process.stdout.write("🖼️\n"); }
    else           { withoutImage++; process.stdout.write("—\n"); }

    await db.product.upsert({
      where: { id: stableId },
      update: { price: price as any, description: description ?? null, imageUrl },
      create: { id: stableId, name, description: description ?? null, price: price as any, categoryId, imageUrl },
    });

    // Pausa para no saturar la API pública
    await new Promise((r) => setTimeout(r, 400));
  }

  // ── Empleados ───────────────────────────────────────────────────────────
  console.log("\n");
  const adminHash = await bcrypt.hash("admin123", 12);
  await db.employee.upsert({
    where: { legajo: 1 },
    update: {},
    create: { legajo: 1, name: "Administrador", passwordHash: adminHash, role: "ADMINISTRADOR" },
  });
  const opHash = await bcrypt.hash("operador123", 12);
  await db.employee.upsert({
    where: { legajo: 100 },
    update: {},
    create: { legajo: 100, name: "Operador Demo", passwordHash: opHash, role: "OPERADOR" },
  });

  console.log("✅ Empleados: admin (legajo 1 / admin123) · operador (legajo 100 / operador123)");
  console.log(`\n🎉 Seed completado:`);
  console.log(`   ${PRODUCTS.length} productos · ${withImage} con imagen · ${withoutImage} sin imagen`);
}

main()
  .catch((e) => { console.error("\n❌", e.message); process.exit(1); })
  .finally(() => db.$disconnect());
