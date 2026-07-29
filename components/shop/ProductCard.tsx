"use client";

import Link from "next/link";
import { useCart } from "@/components/shop/contexts/CartContext";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { Product } from "@/lib/shop/mockData";
import { Button } from "@/components/shop/ui/button";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";

const ProductCard = ({ product }: { product: Product }) => {
  const { addItem } = useCart();
  const { language, t } = useLanguage();

  const discountPercent = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group bg-card border border-border rounded-xl overflow-hidden transition-shadow"
    >
      <Link href={`/shop/product/${product.id}`} className="block relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.badge && (
          <span className="absolute top-3 left-3 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
            {product.badge}
          </span>
        )}
        {discountPercent > 0 && (
          <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-full">
            -{discountPercent}%
          </span>
        )}
      </Link>

      <div className="p-4">
        <Link href={`/shop/product/${product.id}`}>
          <h3 className="font-medium text-sm mb-1 line-clamp-2 hover:text-primary transition-colors">
            {language === "th" ? product.nameTh : product.name}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground mb-2">{product.code}</p>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold text-primary">฿{product.price.toLocaleString()}</span>
          {product.originalPrice && (
            <span className="text-sm text-muted-foreground line-through">฿{product.originalPrice.toLocaleString()}</span>
          )}
        </div>

        <div className="flex items-center gap-1 mb-3">
          <span className="text-yellow-500 text-sm inline-flex items-center gap-0.5">
            {Array.from({ length: Math.floor(product.rating) }).map((_, idx) => (
              <FontAwesomeIcon key={idx} icon={faStar} />
            ))}
          </span>
          <span className="text-xs text-muted-foreground">({product.reviews})</span>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => addItem({ id: product.id, name: product.name, price: product.price, originalPrice: product.originalPrice, image: product.image, code: product.code })}
          >
            {t("btn.addToCart")}
          </Button>
          <Link href={`/shop/product/${product.id}`} className="flex-1">
            <Button size="sm" className="w-full text-xs">{t("btn.buyNow")}</Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
