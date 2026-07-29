"use client";

import { useState } from "react";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { promotions } from "@/lib/shop/mockData";
import { Button } from "@/components/shop/ui/button";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

const PromotionSection = () => {
  const { language, t } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section className="py-12">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">{t("section.promotions")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {promotions.map((promo, i) => (
            <motion.div
              key={promo.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative overflow-hidden rounded-xl p-6 bg-gradient-to-br ${promo.color} text-primary-foreground`}
            >
              <div className="absolute top-2 right-2 font-pixel text-xs opacity-30">PROMO</div>
              <p className="text-3xl font-bold mb-1">{promo.discount}% {t("promo.discount")}</p>
              <h3 className="text-lg font-semibold mb-2">
                {language === "th" ? promo.titleTh : promo.title}
              </h3>
              <p className="text-sm opacity-90 mb-4">
                {language === "th" ? promo.descriptionTh : promo.description}
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-background/20 px-3 py-1.5 rounded-lg text-sm font-mono font-bold">{promo.code}</code>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyCode(promo.code, promo.id)}
                  className="text-xs"
                >
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromotionSection;
