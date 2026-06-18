/**
 * Import recipes from TheMealDB into Supabase with pgvector embeddings.
 *
 * Prerequisites:
 *   1. Run the pgvector SQL in Supabase SQL Editor (see README / conversation)
 *   2. VOYAGE_API_KEY set in .env
 *   3. DATABASE_URL / DIRECT_URL set in .env
 *
 * Usage:
 *   npx tsx scripts/import-recipes.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "@prisma/client";
import { generateEmbeddingsBatch, toVectorLiteral } from "../lib/embeddings";

const db = new PrismaClient();
const MEALDB = "https://www.themealdb.com/api/json/v1/1";

interface MealSummary { idMeal: string; strMeal: string }
interface MealDetail { [key: string]: string | null }
interface Ingredient { nombre: string; cantidad: string }

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json() as T;
}

function extractIngredients(meal: MealDetail): Ingredient[] {
  const out: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    if (!name) break;
    out.push({ nombre: name, cantidad: meal[`strMeasure${i}`]?.trim() ?? "" });
  }
  return out;
}

async function main() {
  console.log("📥 Fetching TheMealDB categories...");
  const { categories } = await fetchJson<{ categories: { strCategory: string }[] }>(
    `${MEALDB}/categories.php`
  );

  const rows: {
    name: string;
    category: string;
    servings: number;
    ingredients: Ingredient[];
    source_id: string;
    embedText: string;
  }[] = [];

  for (const { strCategory: cat } of categories) {
    const { meals } = await fetchJson<{ meals: MealSummary[] | null }>(
      `${MEALDB}/filter.php?c=${encodeURIComponent(cat)}`
    );
    if (!meals) continue;

    console.log(`  ${cat}: ${meals.length} meals`);

    for (const { idMeal } of meals) {
      const detail = await fetchJson<{ meals: MealDetail[] | null }>(
        `${MEALDB}/lookup.php?i=${idMeal}`
      );
      const meal = detail.meals?.[0];
      if (!meal) continue;

      const ingredients = extractIngredients(meal);
      if (ingredients.length === 0) continue;

      const name = (meal.strMeal as string).trim();
      const embedText = `Receta: ${name}. Categoría: ${cat}. Ingredientes: ${ingredients.map((i) => i.nombre).join(", ")}.`;

      rows.push({ name, category: cat, servings: 4, ingredients, source_id: idMeal, embedText });

      await new Promise((r) => setTimeout(r, 80)); // respect TheMealDB rate limit
    }
  }

  console.log(`\n📋 ${rows.length} recipes fetched from TheMealDB.`);

  console.log("🧠 Generating embeddings...");
  const embeddings = await generateEmbeddingsBatch(rows.map((r) => r.embedText));

  // Connect to DB only now — after all HTTP fetching is done
  console.log("💾 Inserting into Supabase (skipping duplicates)...");
  let inserted = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const vector = toVectorLiteral(embeddings[i]);
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO recipes (name, category, servings, ingredients, source_id, embedding)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6::vector)
         ON CONFLICT (source_id) DO NOTHING`,
        r.name,
        r.category,
        r.servings,
        JSON.stringify(r.ingredients),
        r.source_id,
        vector
      );
      inserted++;
      if (inserted % 25 === 0) console.log(`  ${inserted}/${rows.length}`);
    } catch (err) {
      console.error(`  ❌ ${r.name}:`, err);
    }
  }

  console.log(`\n✅ Done — ${inserted} recipes imported.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
