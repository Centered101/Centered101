"use client";

import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { partners } from "@/lib/shop/mockData";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandshake } from "@fortawesome/free-solid-svg-icons";

const PartnerSection = () => {
  const { language, t } = useLanguage();

  return (
    <section className="py-12">
      <div className="container mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">{t("section.partners")}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {partners.map((partner, i) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-xl border border-border p-6 text-center ${partner.active ? "bg-card hover:shadow-lg" : "bg-muted/50 opacity-60"} transition-all`}
            >
              {partner.active && partner.logo ? (
                <img src={partner.logo} alt={partner.name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover" loading="lazy" />
              ) : (
                <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-accent flex items-center justify-center text-2xl">
                  <FontAwesomeIcon icon={faHandshake} />
                </div>
              )}
              <h3 className="font-semibold text-lg mb-2">{partner.name}</h3>
              <p className="text-sm text-muted-foreground">
                {language === "th" ? partner.descriptionTh : partner.description}
              </p>
              {!partner.active && (
                <span className="inline-block mt-3 font-pixel text-xs text-primary">{t("partner.comingSoon")}</span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerSection;
