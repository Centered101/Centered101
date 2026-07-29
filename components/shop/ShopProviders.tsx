"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/components/shop/contexts/LanguageContext";
import { CartProvider } from "@/components/shop/contexts/CartContext";
import { ShopAuthProvider } from "@/components/shop/contexts/ShopAuthContext";
import { TooltipProvider } from "@/components/shop/ui/tooltip";
import { Toaster } from "@/components/shop/ui/toaster";

export default function ShopProviders({ children }: { children: ReactNode }) {
  // Note: the root layout already renders a global sonner <Toaster>, so the
  // shop only mounts the radix toaster used by its admin screens.
  return (
    <LanguageProvider>
      <CartProvider>
        <ShopAuthProvider>
          <TooltipProvider>
            <Toaster />
            {children}
          </TooltipProvider>
        </ShopAuthProvider>
      </CartProvider>
    </LanguageProvider>
  );
}
