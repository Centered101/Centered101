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

export default function LoginPage() {
  const { t } = useLanguage();
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    toast({ title: "Welcome back!" });
    router.push("/shop");
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle("/shop");
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
      setGoogleLoading(false);
    }
    // On success the browser is redirected to Google, so no further action here.
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto py-16 max-w-md">
        <div className="bg-card p-8 rounded-xl border border-border">
          <div className="text-center mb-6">
            <ShopBrand size="md" align="center" />
            <p className="text-sm text-muted-foreground mt-2">{t("nav.login")}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : `${t("nav.login")} →`}
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
            Don&apos;t have an account?{" "}
            <Link href="/shop/register" className="text-primary hover:underline">{t("nav.register")}</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
