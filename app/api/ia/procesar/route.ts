import { auth } from "@/auth";
import { db } from "@/lib/db";
import { processOrderWithAI } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

// Cache del catálogo en memoria: se invalida cada 5 minutos
let catalogCache: { data: any[]; products: any[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getCatalog() {
  const now = Date.now();
  if (catalogCache && now < catalogCache.expiresAt) {
    return catalogCache;
  }

  const products = await db.product.findMany({
    where: { isActive: true },
    include: { category: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const data = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category.name,
    price: p.price.toString(),
  }));

  catalogCache = { data, products, expiresAt: now + CACHE_TTL_MS };
  return catalogCache;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "cliente") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { data: catalog, products } = await getCatalog();
  const contentType = req.headers.get("content-type") || "";

  try {
    let result;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const text = formData.get("text") as string | null;

      if (file) {
        const bytes = await file.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        result = await processOrderWithAI("Analizá la imagen", catalog, base64, file.type);
      } else if (text) {
        result = await processOrderWithAI(text, catalog);
      } else {
        return NextResponse.json({ error: "Falta contenido" }, { status: 400 });
      }
    } else {
      const { type, content } = await req.json();
      if (type !== "text" || !content) {
        return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
      }
      result = await processOrderWithAI(content, catalog);
    }

    const enrichedItems = result.items.map((item) => {
      const product = products.find((p: any) => p.id === item.productoId);
      return {
        ...item,
        productoNombre: product?.name ?? null,
        precio: product?.price.toString() ?? null,
        categoria: product?.category?.name ?? null,
        imageUrl: product?.imageUrl ?? null,
      };
    });

    return NextResponse.json({ items: enrichedItems, observaciones: result.observaciones });
  } catch (error: any) {
    const isQuota = error?.message?.includes("cuota") || error?.message?.includes("429");
    return NextResponse.json(
      { error: error.message || "Error al procesar con IA", code: isQuota ? "QUOTA_EXCEEDED" : "AI_ERROR" },
      { status: isQuota ? 429 : 500 }
    );
  }
}
