"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/shop/contexts/CartContext";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import SearchBar from "./SearchBar";
import { ShopBrand } from "@/components/shop/ShopBrand";
import { Button } from "@/components/shop/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/shop/ui/sheet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCartShopping } from "@fortawesome/free-solid-svg-icons";

const Navbar = () => {
  const { totalItems, setIsCartOpen } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: "/shop#categories", label: t("nav.categories") },
    { to: "/shop/promotions", label: t("nav.promotion") },
    { to: "/shop#videos", label: t("nav.video") },
    { to: "/shop/partners", label: t("nav.partner") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex items-center gap-4 py-3">
        {/* Logo */}
        <Link href="/shop" className="flex items-center gap-2 flex-shrink-0">
          <img src="/shop/favicon.ico" alt="shop.centered101.com" className="w-10 h-10 rounded-full" />
          <ShopBrand size="sm" />
        </Link>

        {/* Search - desktop */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <SearchBar />
        </div>

        {/* Nav links - desktop */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.to} href={link.to} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === "en" ? "th" : "en")}
            className="text-xs font-medium px-2 py-1 rounded-md bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {language === "en" ? "TH" : "EN"}
          </button>

          {/* Cart */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Open cart"
          >
            <FontAwesomeIcon icon={faCartShopping} className="text-xl" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>

          {/* Login */}
          <Link href="/shop/login">
            <Button size="sm" variant="outline" className="hidden sm:flex">
              {t("nav.login")}
            </Button>
          </Link>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 rounded-lg hover:bg-accent" aria-label="Open menu">
                <FontAwesomeIcon icon={faBars} className="text-xl" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 mt-8">
                <div className="mb-4">
                  <SearchBar />
                </div>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    href={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-base font-medium rounded-lg hover:bg-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link href="/shop/login" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full mt-4">{t("nav.login")}</Button>
                </Link>
                <Link href="/shop/register" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">{t("nav.register")}</Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search - mobile */}
      <div className="md:hidden px-4 pb-3">
        <SearchBar />
      </div>
    </header>
  );
};

export default Navbar;
