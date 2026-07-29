"use client";

import Link from "next/link";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import SearchBar from "./SearchBar";
import { Button } from "@/components/shop/ui/button";
import { motion } from "framer-motion";

const HeroSection = () => {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden py-16 md:py-24 bg-cover bg-center">
      <div className="absolute inset-0 -z-10">
        <div
          className="max-w-7xl absolute inset-0 bg-contain bg-bottom opacity-75 mx-auto"
          style={{ backgroundImage: "url('/shop/Hero.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-white/40 to-transparent" />
      </div>
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-20 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-40 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
      </div>

      <div className="container mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <img
            src="/shop/favicon.ico"
            alt="shop.centered101.com"
            className="animate-float size-24 rounded-full mx-auto mb-4"
            style={{ animationDuration: "3.2s" }}
          />
          <h1 className="animate-float mb-4 flex flex-col items-center">
            <span className="font-pixel text-3xl md:text-5xl text-primary">shop</span>
            <span className="font-pixel text-base md:text-xl text-foreground/80 mt-1">.centered101.com</span>
          </h1>
          <p className="text-lg md:text-xl font-medium text-foreground/80 mb-2">
            {t("hero.tagline")}
          </p>
          <p className="text-sm md:text-base text-muted-foreground mb-8 max-w-lg mx-auto">
            {t("hero.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <SearchBar large />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap gap-4 justify-center"
        >
          <Link href="/shop#trending">
            <Button size="lg" className="rounded-xl px-8 animate-pulse-glow">
              {t("hero.shopNow")} →
            </Button>
          </Link>
          <Link href="/shop#categories">
            <Button size="lg" variant="outline" className="rounded-xl px-8">
              {t("hero.explore")}
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
