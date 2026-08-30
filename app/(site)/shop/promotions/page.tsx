"use client";

import { useState } from "react";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { promotions } from "@/lib/shop/mockData";
import { Button } from "@/components/shop/ui/button";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import CartDrawer from "@/components/shop/CartDrawer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

export default function PromotionsPage() {
  const { language, t } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <CartDrawer />
      <main className="container mx-auto py-12">
        <h1 className="text-3xl font-bold text-center mb-2">{t("section.promotions")}</h1>
        <p className="text-center text-muted-foreground mb-8">Grab the best deals before they&apos;re gone!</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((promo) => (
            <div key={promo.id} className={`rounded-xl p-8 bg-gradient-to-br ${promo.color} text-primary-foreground`}>
              <div className="font-pixel text-xs opacity-30 mb-2">PROMO</div>
              <p className="text-4xl font-bold mb-2">{promo.discount}% {t("promo.discount")}</p>
              <h2 className="text-xl font-semibold mb-2">{language === "th" ? promo.titleTh : promo.title}</h2>
              <p className="opacity-90 mb-6">{language === "th" ? promo.descriptionTh : promo.description}</p>
              <div className="flex items-center gap-2">
                <code className="bg-background/20 px-4 py-2 rounded-lg font-mono font-bold">{promo.code}</code>
                <Button variant="secondary" onClick={() => copyCode(promo.code, promo.id)}>
                  {copiedId === promo.id ? (
                    <span className="inline-flex items-center gap-2">
                      <FontAwesomeIcon icon={faCheck} />
                      Copied!
                    </span>
                  ) : (
                    t("btn.copyCode")
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
