"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/components/shop/contexts/CartContext";
import { Button } from "@/components/shop/ui/button";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto py-20 max-w-lg text-center">
        <div className="text-6xl text-success mb-6">
          <FontAwesomeIcon icon={faCircleCheck} />
        </div>
        <h1 className="text-2xl font-bold mb-3">Thank you for your order!</h1>
        <p className="text-muted-foreground mb-8">
          Your payment was successful. We&apos;ve received your order and will process it shortly.
        </p>
        <Link href="/shop">
          <Button size="lg">Continue Shopping</Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}
