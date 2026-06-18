import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/embeddings";

const anthropic = new Anthropic();

interface RecipeRow {
  id: string;
  name: string;
  category: string;
  servings: number;
  ingredients: string | { nombre: string; cantidad: string }[];
  similarity: number;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "cliente") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { mensaje } = await req.json();
  if (!mensaje?.trim()) {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }

  // 1. Embed user query
  let embedding: number[];
  try {
    embedding = await generateEmbedding(mensaje);
  } catch (err) {
    console.error("[asistente] Embedding error:", err);
    return NextResponse.json({ error: "No se pudo procesar tu consulta. Verificá la VOYAGE_API_KEY." }, { status: 500 });
  }

  // 2. Vector similarity search via Supabase RPC (bypasses pgbouncer)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: recipes, error: rpcError } = await supabase.rpc("match_recipes", {
    query_embedding: `[${embedding.join(",")}]`,
    match_count: 5,
  });

  if (rpcError) {
    return NextResponse.json({ error: `Error RPC: ${rpcError.message}` }, { status: 500 });
  }

  if (!recipes || recipes.length === 0) {
    return NextResponse.json({ error: "No hay recetas en la base de datos. Corré el script de importación primero." }, { status: 404 });
  }

  // 3. Fetch supermarket catalog
  const productos = await db.product.findMany({
    where: { isActive: true },
    include: { category: { select: { name: true } } },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const catalogo = productos.map((p) => ({
    productId: p.id,
    nombre: p.name,
    categoria: p.category?.name ?? "Sin categoría",
    precio: Number(p.price),
    imageUrl: p.imageUrl,
  }));

  // 4. Ask Claude to map each recipe's ingredients to available products
  const recetasParaPrompt = recipes.map((r: RecipeRow) => ({
    nombre: r.name,
    categoria: r.category,
    porciones: r.servings,
    ingredientes: (typeof r.ingredients === "string"
      ? JSON.parse(r.ingredients)
      : r.ingredients) as { nombre: string; cantidad: string }[],
  }));

  const systemPrompt = `Sos un asistente culinario de un supermercado argentino.
Recibís una lista de recetas reales con sus ingredientes (en inglés) y el catálogo de productos disponibles en el supermercado (en español).

Tu tarea:
1. Elegir las 3 recetas que mejor se adapten a lo que pidió el cliente
2. Para cada ingrediente de cada receta, encontrar el producto más cercano en el catálogo usando el productId exacto
3. Si un ingrediente no tiene equivalente en el catálogo, omitirlo

REGLAS DE CANTIDAD — MUY IMPORTANTE:
- La cantidad siempre debe ser un número entero positivo (1, 2, 3...), NUNCA decimales ni fracciones
- Pensá en unidades de venta, no en medidas de receta: si la receta pide 300g de harina y el producto es "Harina 1kg", la cantidad es 1 (un paquete)
- Si la receta pide 50g de queso y el producto es "Queso 200g", la cantidad es 1 (un paquete)
- Si la receta pide 6 huevos y el producto es "Huevos x12", la cantidad es 1
- Solo ponés cantidad 2 o más si realmente necesitás más de un envase completo para la receta
- La unidad debe reflejar cómo se vende el producto: "unidad", "paquete", "docena", etc. NUNCA "kg", "g", "ml"
- Usá SOLO productIds que existan en el catálogo provisto
- Devolvé ÚNICAMENTE JSON válido, sin texto ni markdown adicional

FORMATO DE RESPUESTA:
{
  "recetas": [
    {
      "nombre": "Nombre de la receta (traducido al español)",
      "descripcion": "Descripción apetitosa en 2 oraciones en español.",
      "porciones": 4,
      "ingredientes": [
        {
          "productId": "id-exacto-del-catalogo",
          "productoNombre": "Nombre del producto del catálogo",
          "cantidad": 2,
          "unidad": "unidades"
        }
      ]
    }
  ]
}`;

  const userPrompt = `El cliente dijo: "${mensaje}"

Recetas recuperadas de la base de datos (ordenadas por relevancia):
${JSON.stringify(recetasParaPrompt, null, 2)}

Catálogo de productos del supermercado:
${JSON.stringify(catalogo, null, 2)}`;

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 3000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText = message.content[0].type === "text" ? message.content[0].text : "";

  // Strip markdown code blocks if present
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : cleaned;

  let parsed: {
    recetas: {
      nombre: string;
      descripcion: string;
      porciones: number;
      ingredientes: { productId: string; productoNombre: string; cantidad: number; unidad: string }[];
    }[];
  };

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error("[asistente] JSON parse failed. Raw:", rawText.slice(0, 500));
    return NextResponse.json({ error: "El asistente no pudo procesar las recetas. Intentá de nuevo." }, { status: 500 });
  }

  // 5. Enrich with price and imageUrl from catalog
  const productoMap = new Map(catalogo.map((p) => [p.productId, p]));
  const recetasEnriquecidas = parsed.recetas.map((receta) => ({
    ...receta,
    ingredientes: receta.ingredientes
      .map((ing) => {
        const prod = productoMap.get(ing.productId);
        if (!prod) return null;
        return {
          productId: ing.productId,
          productoNombre: prod.nombre,
          cantidad: ing.cantidad,
          unidad: ing.unidad,
          precio: prod.precio.toString(),
          categoria: prod.categoria,
          imageUrl: prod.imageUrl,
        };
      })
      .filter(Boolean),
  }));

  return NextResponse.json({ recetas: recetasEnriquecidas });
}
