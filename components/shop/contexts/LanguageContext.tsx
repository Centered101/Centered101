"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "th";

interface Translations {
  [key: string]: { en: string; th: string };
}

const translations: Translations = {
  "nav.categories": { en: "Categories", th: "หมวดหมู่" },
  "nav.promotion": { en: "Promotion", th: "โปรโมชั่น" },
  "nav.video": { en: "Video", th: "วิดีโอ" },
  "nav.partner": { en: "Partner", th: "พาร์ทเนอร์" },
  "nav.login": { en: "Login", th: "เข้าสู่ระบบ" },
  "nav.register": { en: "Register", th: "สมัครสมาชิก" },
  "hero.tagline": { en: "Digital Store Platform", th: "แพลตฟอร์มร้านค้าดิจิทัล" },
  "hero.subtitle": { en: "Search, discover, and shop partner products in seconds", th: "ค้นหา ค้นพบ และซื้อสินค้าพาร์ทเนอร์ในไม่กี่วินาที" },
  "hero.shopNow": { en: "Shop Now", th: "ช้อปเลย" },
  "hero.explore": { en: "Explore Categories", th: "สำรวจหมวดหมู่" },
  "search.placeholder": { en: "Search by product name, code, or discount code...", th: "ค้นหาด้วยชื่อสินค้า, รหัสสินค้า หรือรหัสส่วนลด..." },
  "cat.health": { en: "Health", th: "สุขภาพ" },
  "cat.beauty": { en: "Beauty", th: "ความงาม" },
  "cat.lifestyle": { en: "Lifestyle", th: "ไลฟ์สไตล์" },
  "cat.tech": { en: "Tech", th: "เทคโนโลยี" },
  "cat.partner": { en: "Partner", th: "พาร์ทเนอร์" },
  "section.trending": { en: "Trending Products", th: "สินค้ายอดนิยม" },
  "section.promotions": { en: "Hot Promotions", th: "โปรโมชั่นสุดฮอต" },
  "section.videos": { en: "Video Recommendations", th: "วิดีโอแนะนำ" },
  "section.partners": { en: "Our Partners", th: "พาร์ทเนอร์ของเรา" },
  "btn.addToCart": { en: "Add to Cart", th: "เพิ่มลงตะกร้า" },
  "btn.buyNow": { en: "Buy Now", th: "ซื้อเลย" },
  "btn.viewAll": { en: "View All", th: "ดูทั้งหมด" },
  "btn.copyCode": { en: "Copy Code", th: "คัดลอกรหัส" },
  "btn.apply": { en: "Apply", th: "ใช้งาน" },
  "cart.title": { en: "Shopping Cart", th: "ตะกร้าสินค้า" },
  "cart.empty": { en: "Your cart is empty", th: "ตะกร้าว่างเปล่า" },
  "cart.total": { en: "Total", th: "รวมทั้งหมด" },
  "cart.checkout": { en: "Checkout", th: "ชำระเงิน" },
  "checkout.info": { en: "Customer Info", th: "ข้อมูลลูกค้า" },
  "checkout.address": { en: "Address", th: "ที่อยู่" },
  "checkout.shipping": { en: "Shipping", th: "การจัดส่ง" },
  "checkout.payment": { en: "Payment", th: "ชำระเงิน" },
  "checkout.confirm": { en: "Confirm Order", th: "ยืนยันคำสั่งซื้อ" },
  "footer.contact": { en: "Contact Us", th: "ติดต่อเรา" },
  "footer.policy": { en: "Privacy Policy", th: "นโยบายความเป็นส่วนตัว" },
  "footer.terms": { en: "Terms of Service", th: "ข้อกำหนดการให้บริการ" },
  "footer.about": { en: "About Us", th: "เกี่ยวกับเรา" },
  "product.code": { en: "Product Code", th: "รหัสสินค้า" },
  "product.description": { en: "Description", th: "รายละเอียด" },
  "product.reviews": { en: "Reviews", th: "รีวิว" },
  "product.related": { en: "Related Products", th: "สินค้าที่เกี่ยวข้อง" },
  "promo.discount": { en: "OFF", th: "ลด" },
  "partner.comingSoon": { en: "Coming Soon", th: "เร็วๆ นี้" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
