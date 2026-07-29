"use client";

import { useCart } from "@/components/shop/contexts/CartContext";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { Button } from "@/components/shop/ui/button";
import { Input } from "@/components/shop/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/shop/ui/sheet";
import Link from "next/link";
import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCartShopping, faCheck, faXmark, faArrowRight } from "@fortawesome/free-solid-svg-icons";

const CartDrawer = () => {
  const { items, removeItem, updateQuantity, totalItems, totalPrice, discount, couponCode, applyCoupon, removeCoupon, isCartOpen, setIsCartOpen } = useCart();
  const { t } = useLanguage();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState(false);

  const handleApplyCoupon = () => {
    const success = applyCoupon(couponInput);
    if (success) {
      setCouponInput("");
      setCouponError(false);
    } else {
      setCouponError(true);
    }
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{t("cart.title")} ({totalItems})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            <FontAwesomeIcon icon={faCartShopping} className="text-6xl" />
            <p className="text-muted-foreground">{t("cart.empty")}</p>
            <Button onClick={() => setIsCartOpen(false)}>{t("hero.shopNow")}</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.code}</p>
                    <p className="text-sm font-bold text-primary">฿{item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button onClick={() => removeItem(item.id)} className="text-xs text-destructive hover:underline" aria-label="Remove item">
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-accent text-sm flex items-center justify-center">-</button>
                      <span className="text-sm w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-accent text-sm flex items-center justify-center">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="border-t border-border pt-4 space-y-3">
              {couponCode ? (
                <div className="flex items-center justify-between bg-success/10 p-2 rounded-lg">
                  <span className="text-sm font-medium text-success inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faCheck} />
                    {couponCode} (-฿{discount})
                  </span>
                  <button onClick={removeCoupon} className="text-xs text-destructive">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponError(false); }}
                    placeholder="Coupon code"
                    className={`text-sm ${couponError ? "border-destructive" : ""}`}
                  />
                  <Button size="sm" variant="outline" onClick={handleApplyCoupon}>{t("btn.apply")}</Button>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold">
                <span>{t("cart.total")}</span>
                <span className="text-primary">฿{totalPrice.toLocaleString()}</span>
              </div>

              <Link href="/shop/checkout" onClick={() => setIsCartOpen(false)}>
                <Button className="w-full gap-2" size="lg">
                  {t("cart.checkout")} <FontAwesomeIcon icon={faArrowRight} />
                </Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
