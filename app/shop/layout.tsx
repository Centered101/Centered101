import type { Metadata } from "next";
import "./shop-theme.css";
import ShopProviders from "@/components/shop/ShopProviders";

export const metadata: Metadata = {
  title: "shop.centered101.com",
  description: "Digital Store Platform — shop.centered101.com",
  // Shop gets its own favicon, separate from Centered101's.
  icons: {
    icon: "/shop/favicon.ico",
    shortcut: "/shop/favicon.ico",
    apple: "/shop/favicon.png",
  },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Shop-specific fonts (Press Start 2P for the retro logo, Kanit for Thai). */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&family=Press+Start+2P&display=swap"
      />
      <div className="shop-theme">
        <ShopProviders>{children}</ShopProviders>
      </div>
    </>
  );
}
