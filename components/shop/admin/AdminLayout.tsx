"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShopBrand } from "@/components/shop/ShopBrand";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { useAuth } from "@/components/shop/contexts/ShopAuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faBars,
  faBell,
  faBox,
  faChartLine,
  faHouse,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: "/shop/admin", icon: faChartLine, label: "Dashboard" },
  { path: "/shop/admin/products", icon: faBox, label: "Products" },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const { signOut, user } = useAuth();

  const isActive = (path: string) => {
    if (path === "/shop/admin") return pathname === "/shop/admin";
    return pathname.startsWith(path);
  };

  const pageTitle = menuItems.find((item) => isActive(item.path))?.label || "Dashboard";

  const handleLogout = async () => {
    await signOut();
    router.push("/shop/admin/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out ${sidebarOpen ? "w-64" : "w-[72px]"} ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <Link href="/shop/admin" className="flex items-center gap-2">
              <ShopBrand size="sm" />
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">Admin</span>
            </Link>
          )}
          <button onClick={() => { setSidebarOpen(!sidebarOpen); if (!sidebarOpen) setMobileOpen(false); }}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
            <FontAwesomeIcon icon={sidebarOpen ? faArrowLeft : faArrowRight} />
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-3">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link href={item.path} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.path) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
                  <span className="text-lg flex-shrink-0">
                    <FontAwesomeIcon icon={item.icon} />
                  </span>
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-3 border-t border-border">
          <Link href="/shop" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <span className="text-lg">
              <FontAwesomeIcon icon={faHouse} />
            </span>
            {sidebarOpen && <span>Back to Store</span>}
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mt-1">
            <span className="text-lg">
              <FontAwesomeIcon icon={faRightFromBracket} />
            </span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-accent" aria-label="Open menu">
              <FontAwesomeIcon icon={faBars} />
            </button>
            <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setLanguage(language === "en" ? "th" : "en")}
              className="text-xs font-medium px-2 py-1 rounded-md bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
              {language === "en" ? "TH" : "EN"}
            </button>
            <button className="relative p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Notifications">
              <span className="text-lg">
                <FontAwesomeIcon icon={faBell} />
              </span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
