import Image from "next/image";
import Link from "next/link";
import { Category } from "../types";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/products?category=${category.slug}`}
      className="group relative overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-1 hover:shadow-card"
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200">
        {category.image && (
          <Image
            src={category.image}
            alt={category.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-4 left-4 space-y-2">
          <span className="pill bg-white/90 text-xs font-semibold text-secondary shadow">
            {category.slug.toUpperCase()}
          </span>
          <h3 className="font-heading text-xl font-semibold text-white">{category.name}</h3>
        </div>
      </div>
    </Link>
  );
}
