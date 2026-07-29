"use client";

import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { products } from "@/lib/shop/mockData";
import ProductCard from "./ProductCard";

const TrendingProducts = () => {
  const { t } = useLanguage();

  return (
    <section id="trending" className="py-12 bg-muted/30">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">{t("section.trending")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingProducts;
