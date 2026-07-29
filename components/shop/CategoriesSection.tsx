"use client";

import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { categories } from "@/lib/shop/mockData";
import { motion } from "framer-motion";
import { CategoryIcon } from "@/components/shop/CategoryIcon";

const CategoriesSection = () => {
  const { language } = useLanguage();

  return (
    <section id="categories" className="py-12">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">
          {language === "th" ? "หมวดหมู่สินค้า" : "Shop by Category"}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card border border-border hover:border-primary hover:shadow-lg transition-all"
            >
              <span className="text-4xl">
                <CategoryIcon id={cat.icon} />
              </span>
              <span className="font-medium text-sm">{language === "th" ? cat.labelTh : cat.label}</span>
              <span className="text-xs text-muted-foreground">{cat.count} items</span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
