import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Tipos exportados — los nombres se mantienen para no tocar el resto del codebase
export interface GeminiOrderItem {
  productoId: string | null;
  nombreDetectado: string;
  cantidad: number;
  confianza: "alta" | "media" | "baja" | "no_encontrado";
}

export interface GeminiOrderResult {
  items: GeminiOrderItem[];
  observaciones: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  category: string;
  price: string;
}

const SYSTEM_PROMPT = `Sos un asistente de supermercado. Interpretá la lista de compras del usuario y mapeá cada ítem con el catálogo disponible.

Devolvé ÚNICAMENTE un JSON con este formato exacto, sin texto adicional:
{
  "items": [
    {
      "productoId": "id_del_producto_o_null",
      "nombreDetectado": "nombre como lo escribió el usuario",
      "cantidad": numero_entero,
      "confianza": "alta|media|baja|no_encontrado"
    }
  ],
  "observaciones": "notas generales si hay ítems no encontrados o ambigüedades"
}

Reglas:
- Si encontrás el producto en el catálogo, usá su ID exacto y confianza "alta" o "media"
- Si no encontrás el producto, usá productoId: null y confianza: "no_encontrado"
- Siempre intentá inferir una cantidad razonable (default: 1)
- No inventes productos que no estén en el catálogo`;

export async function processOrderWithAI(
  input: string,
  catalog: CatalogProduct[],
  imageBase64?: string,
  imageMimeType?: string
): Promise<GeminiOrderResult> {
  const catalogText = catalog
    .map((p) => `ID:${p.id} | ${p.name} | Categoría: ${p.category} | Precio: $${p.price}`)
    .join("\n");

  const systemWithCatalog = `${SYSTEM_PROMPT}\n\nCATÁLOGO DISPONIBLE:\n${catalogText}`;

  const userContent: Anthropic.MessageParam["content"] = imageBase64 && imageMimeType
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: imageMimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: imageBase64,
          },
        },
        { type: "text", text: "Interpretá la lista de compras de la imagen." },
      ]
    : input;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemWithCatalog,
      messages: [{ role: "user", content: userContent }],
    });

    const text = (response.content[0] as Anthropic.TextBlock).text.trim();
    const jsonText = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(jsonText) as GeminiOrderResult;
  } catch (err: any) {
    const msg: string = err?.message ?? String(err);
    const isOverload = err?.status === 529 || msg.includes("overloaded");
    const isQuota = err?.status === 429 || msg.includes("rate_limit");

    console.error("[Claude Haiku] Error:", msg.slice(0, 200));

    if (isOverload || isQuota) {
      throw new Error(
        "El servicio de IA está saturado en este momento. Podés ingresar tu lista manualmente usando el buscador de productos."
      );
    }
    throw new Error("No se pudo procesar la lista con IA. Intentá nuevamente en unos minutos.");
  }
}
