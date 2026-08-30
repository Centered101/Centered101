"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { products } from "@/lib/shop/mockData";
import { useCart } from "@/components/shop/contexts/CartContext";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { Button } from "@/components/shop/ui/button";
import { Input } from "@/components/shop/ui/input";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import CartDrawer from "@/components/shop/CartDrawer";
import ProductCard from "@/components/shop/ProductCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faCopy, faArrowRight, faStar } from "@fortawesome/free-solid-svg-icons";

export default function ProductDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { addItem } = useCart();
  const { language, t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [couponInput, setCouponInput] = useState("");

  const product = products.find((p) => p.id === id);
  if (!product) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Link href="/shop"><Button>Go Home</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const discountPercent = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  const copyCode = () => {
    navigator.clipboard.writeText(product.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <CartDrawer />
      <main className="container mx-auto py-8">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Image */}
          <div className="relative rounded-xl overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full h-96 object-cover" />
            {product.badge && (
              <span className="absolute top-4 left-4 bg-primary text-primary-foreground font-bold px-4 py-2 rounded-full">{product.badge}</span>
            )}
            {discountPercent > 0 && (
              <span className="absolute top-4 right-4 bg-destructive text-destructive-foreground font-bold px-3 py-1 rounded-full">-{discountPercent}%</span>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <h1 className="text-2xl md:text-3xl font-bold">
              {language === "th" ? product.nameTh : product.name}
            </h1>

            <div className="flex items-center gap-2">
              <span className="text-yellow-500 inline-flex items-center gap-0.5">
                {Array.from({ length: Math.floor(product.rating) }).map((_, idx) => (
                  <FontAwesomeIcon key={idx} icon={faStar} />
                ))}
              </span>
              <span className="text-sm text-muted-foreground">({product.reviews} {t("product.reviews")})</span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">฿{product.price.toLocaleString()}</span>
              {product.originalPrice && (
                <span className="text-lg text-muted-foreground line-through">฿{product.originalPrice.toLocaleString()}</span>
              )}
            </div>

            {/* Product code */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">{t("product.code")}:</span>
              <code className="font-mono font-bold">{product.code}</code>
              <Button size="sm" variant="ghost" onClick={copyCode}>
                <span className="inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                  {copied ? "Copied!" : "Copy"}
                </span>
              </Button>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">{t("product.description")}</h3>
              <p className="text-muted-foreground">{language === "th" ? product.descriptionTh : product.description}</p>
            </div>

            {/* Coupon */}
            <div className="flex gap-2">
              <Input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Enter coupon code" />
              <Button variant="outline">{t("btn.apply")}</Button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => addItem({ id: product.id, name: product.name, price: product.price, originalPrice: product.originalPrice, image: product.image, code: product.code })}
              >
                {t("btn.addToCart")}
              </Button>
              <Link href="/shop/checkout" className="flex-1">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => addItem({ id: product.id, name: product.name, price: product.price, originalPrice: product.originalPrice, image: product.image, code: product.code })}
                >
                  <span className="inline-flex items-center gap-2">
                    {t("btn.buyNow")} <FontAwesomeIcon icon={faArrowRight} />
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-6">{t("product.related")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
