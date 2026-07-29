"use client";

import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { partners } from "@/lib/shop/mockData";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import CartDrawer from "@/components/shop/CartDrawer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandshake } from "@fortawesome/free-solid-svg-icons";

export default function PartnersPage() {
  const { language, t } = useLanguage();

  return (
    <div className="min-h-screen">
      <Navbar />
      <CartDrawer />
      <main className="container mx-auto py-12">
        <h1 className="text-3xl font-bold text-center mb-2">{t("section.partners")}</h1>
        <p className="text-center text-muted-foreground mb-8">Trusted brands we work with</p>
        <div className="grid md:grid-cols-3 gap-8">
          {partners.map((partner) => (
            <div key={partner.id} className={`rounded-xl border border-border p-8 text-center ${partner.active ? "bg-card" : "bg-muted/50 opacity-60"}`}>
              {partner.active && partner.logo ? (
                <img src={partner.logo} alt={partner.name} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-accent flex items-center justify-center text-3xl">
                  <FontAwesomeIcon icon={faHandshake} />
                </div>
              )}
              <h2 className="text-xl font-semibold mb-2">{partner.name}</h2>
              <p className="text-muted-foreground">{language === "th" ? partner.descriptionTh : partner.description}</p>
              {!partner.active && (
                <span className="inline-block mt-4 font-pixel text-xs text-primary">{t("partner.comingSoon")}</span>
              )}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
