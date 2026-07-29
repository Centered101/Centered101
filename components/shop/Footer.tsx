"use client";

import Link from "next/link";
import { ShopBrand } from "@/components/shop/ShopBrand";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInstagram,
  faLine,
  faTiktok,
} from "@fortawesome/free-brands-svg-icons";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <img src="/shop/favicon.ico" alt="shop.centered101.com" className="size-10 rounded-full mb-2" />
            <ShopBrand size="sm" />
            <p className="text-sm text-muted-foreground mt-3">Digital Store Platform</p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link href="/shop" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link href="/shop/promotions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.promotion")}</Link>
              <Link href="/shop/partners" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("nav.partner")}</Link>
            </div>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">Support</h4>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">{t("footer.contact")}</span>
              <Link href="/shop/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.policy")}
              </Link>
              <Link href="/shop/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t("footer.terms")}
              </Link>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold mb-3 text-sm">Follow Us</h4>
            <div className="flex gap-3 text-2xl">
              <a href="https://line.me/R/ti/p/@480ehaoy" target="_blank" rel="noreferrer" aria-label="LINE" className="hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faLine} />
              </a>
              <a href="https://www.tiktok.com/@center.shops" target="_blank" rel="noreferrer" aria-label="TikTok" className="hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faTiktok} />
              </a>
              <a href="https://www.instagram.com/center.shops/" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover:scale-110 transition-transform">
                <FontAwesomeIcon icon={faInstagram} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          © 2026 shop.centered101.com | Centered101 — All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
