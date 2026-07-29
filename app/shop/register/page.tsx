"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/shop/contexts/LanguageContext";
import { useAuth } from "@/components/shop/contexts/ShopAuthContext";
import { Button } from "@/components/shop/ui/button";
import { Input } from "@/components/shop/ui/input";
import { toast } from "@/components/shop/hooks/use-toast";
import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import { ShopBrand } from "@/components/shop/ShopBrand";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle, faLine } from "@fortawesome/free-brands-svg-icons";

export default function RegisterPage() {
  const { t } = useLanguage();
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(form.email, form.password);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    toast({ title: "Account created!", description: "Check your email to confirm, then sign in." });
    router.push("/shop/login");
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle("/shop");
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto py-16 max-w-md">
        <div className="bg-card p-8 rounded-xl border border-border">
          <div className="text-center mb-6">
            <ShopBrand size="md" align="center" />
            <p className="text-sm text-muted-foreground mt-2">{t("nav.register")}</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="First Name" value={form.firstName} onChange={set("firstName")} />
              <Input placeholder="Last Name" value={form.lastName} onChange={set("lastName")} />
            </div>
            <Input placeholder="Email" type="email" value={form.email} onChange={set("email")} required />
            <Input placeholder="Phone" type="tel" value={form.phone} onChange={set("phone")} />
            <Input placeholder="Password" type="password" value={form.password} onChange={set("password")} required />
            <Input placeholder="Confirm Password" type="password" value={form.confirm} onChange={set("confirm")} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : `${t("nav.register")} →`}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>

          <div className="space-y-3">
            <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={googleLoading}>
              <FontAwesomeIcon icon={faGoogle} className="text-lg" />
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </Button>

            <Button type="button" variant="outline" className="w-full gap-2" disabled>
              <FontAwesomeIcon icon={faLine} className="text-lg" />
              LINE Login (soon)
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/shop/login" className="text-primary hover:underline">{t("nav.login")}</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
