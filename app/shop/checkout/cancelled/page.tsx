import Link from "next/link";
import { Button } from "@/components/shop/ui/button";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";

export default function CheckoutCancelledPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto py-20 max-w-lg text-center">
        <div className="text-6xl text-destructive mb-6">
          <FontAwesomeIcon icon={faCircleXmark} />
        </div>
        <h1 className="text-2xl font-bold mb-3">Payment cancelled</h1>
        <p className="text-muted-foreground mb-8">
          Your payment was cancelled and you have not been charged. Your cart is still saved.
        </p>
        <Link href="/shop/checkout">
          <Button size="lg">Back to Checkout</Button>
        </Link>
      </main>
      <Footer />
    </div>
  );
}
