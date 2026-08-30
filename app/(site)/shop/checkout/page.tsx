"use client";

import { useState } from "react";
import { useCart } from "@/components/shop/contexts/CartContext";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { Button } from "@/components/shop/ui/button";
import { Input } from "@/components/shop/ui/input";
import { toast } from "@/components/shop/hooks/use-toast";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import CartDrawer from "@/components/shop/CartDrawer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faArrowRight, faBuildingColumns, faCreditCard, faHeart, faMobileScreenButton } from "@fortawesome/free-solid-svg-icons";

const steps = ["info", "address", "shipping", "payment"] as const;

export default function CheckoutPage() {
  const { items, totalPrice, discount, couponCode } = useCart();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  const paymentMethods = [
    { id: "promptpay", label: "PromptPay", icon: faMobileScreenButton },
    { id: "bank", label: "Bank Transfer", icon: faBuildingColumns },
    { id: "credit", label: "Credit Card", icon: faCreditCard },
    { id: "truemoney", label: "TrueMoney", icon: faHeart },
  ];

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast({ title: "Cart is empty", description: "Add some products first.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ name: i.name, price: i.price, quantity: i.quantity, image: i.image, code: i.code })),
          discount,
          couponCode,
          customer: {
            name: `${customer.firstName} ${customer.lastName}`.trim(),
            email: customer.email,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      toast({ title: "Checkout failed", description: (err as Error).message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <CartDrawer />
      <main className="container mx-auto py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-8">{t("cart.checkout")}</h1>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
              <span className={`text-xs hidden sm:inline ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                {t(`checkout.${s}`)}
              </span>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Form */}
          <div className="md:col-span-2 space-y-6">
            {step === 0 && (
              <div className="space-y-4 bg-card p-6 rounded-xl border border-border">
                <h2 className="font-semibold text-lg">{t("checkout.info")}</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input placeholder="First Name" value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} />
                  <Input placeholder="Last Name" value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} />
                </div>
                <Input placeholder="Email" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                <Input placeholder="Phone" type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
                <Button onClick={() => setStep(1)} className="w-full gap-2">
                  Next <FontAwesomeIcon icon={faArrowRight} />
                </Button>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4 bg-card p-6 rounded-xl border border-border">
                <h2 className="font-semibold text-lg">{t("checkout.address")}</h2>
                <Input placeholder="Address Line 1" />
                <Input placeholder="Address Line 2" />
                <div className="grid sm:grid-cols-3 gap-4">
                  <Input placeholder="City" />
                  <Input placeholder="Province" />
                  <Input placeholder="Postal Code" />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                  </Button>
                  <Button onClick={() => setStep(2)} className="flex-1 gap-2">
                    Next <FontAwesomeIcon icon={faArrowRight} />
                  </Button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4 bg-card p-6 rounded-xl border border-border">
                <h2 className="font-semibold text-lg">{t("checkout.shipping")}</h2>
                <div className="space-y-3">
                  {["Standard (3-5 days) - ฿50", "Express (1-2 days) - ฿120", "Partner Delivery - Free"].map((opt) => (
                    <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary cursor-pointer transition-colors">
                      <input type="radio" name="shipping" className="accent-primary" />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                  </Button>
                  <Button onClick={() => setStep(3)} className="flex-1 gap-2">
                    Next <FontAwesomeIcon icon={faArrowRight} />
                  </Button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4 bg-card p-6 rounded-xl border border-border">
                <h2 className="font-semibold text-lg">{t("checkout.payment")}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                        paymentMethod === pm.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="text-2xl">
                        <FontAwesomeIcon icon={pm.icon} />
                      </span>
                      <span className="font-medium">{pm.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  You will be redirected to our secure Stripe checkout to complete the payment.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                  </Button>
                  <Button className="flex-1 gap-2" size="lg" onClick={handleCheckout} disabled={submitting}>
                    {submitting ? "Redirecting..." : t("checkout.confirm")} <FontAwesomeIcon icon={faArrowRight} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-card p-6 rounded-xl border border-border h-fit sticky top-24">
            <h3 className="font-semibold mb-4">Order Summary</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="truncate flex-1">{item.name} ×{item.quantity}</span>
                  <span className="font-medium">฿{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              {discount > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Discount ({couponCode})</span>
                  <span>-฿{discount}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between text-lg font-bold">
                <span>{t("cart.total")}</span>
                <span className="text-primary">฿{totalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
