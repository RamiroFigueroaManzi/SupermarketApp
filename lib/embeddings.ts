const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-lite"; // 512 dims, fast, free tier

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: [text], model: MODEL }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Voyage AI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.data[0].embedding as number[];
}

// Voyage AI max batch size: 128 texts
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += 128) {
    const chunk = texts.slice(i, i + 128);

    const res = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({ input: chunk, model: MODEL }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Voyage AI error ${res.status}: ${err}`);
    }

    const data = await res.json();
    const sorted = (data.data as { index: number; embedding: number[] }[])
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);

    results.push(...sorted);

    if (i + 128 < texts.length) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return results;
}

// Build a safe vector literal for raw SQL — output contains only digits, dots, commas, brackets
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.map((n) => n.toFixed(8)).join(",")}]`;
}
