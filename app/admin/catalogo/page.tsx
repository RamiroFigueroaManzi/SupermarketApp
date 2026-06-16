import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import CatalogoClient from "@/components/admin/CatalogoClient";

const getCatalogData = unstable_cache(
  async () => {
    const [productos, categorias] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      }),
      db.category.findMany({ orderBy: { name: "asc" } }),
    ]);
    return {
      // Serializar Decimals y Dates antes de cachear
      productos: productos.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price.toString(),
        imageUrl: p.imageUrl,
        categoryId: p.categoryId,
        category: p.category,
      })),
      categorias,
    };
  },
  ["admin-catalog"],
  { revalidate: 60, tags: ["catalog"] }
);

export default async function CatalogoPage() {
  const { productos, categorias } = await getCatalogData();
  return <CatalogoClient initialProductos={productos} categorias={categorias} />;
}
