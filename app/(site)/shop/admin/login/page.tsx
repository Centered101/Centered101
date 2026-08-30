"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/shop/contexts/ShopAuthContext";
import { Button } from "@/components/shop/ui/button";
import { Input } from "@/components/shop/ui/input";
import { ShopBrand } from "@/components/shop/ShopBrand";
import { toast } from "@/components/shop/hooks/use-toast";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Welcome back!", description: "Redirecting to dashboard..." });
    router.push("/shop/admin");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-card p-8 rounded-xl border border-border shadow-lg">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2">
              <ShopBrand size="md" align="center" />
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">Admin</span>
            </div>
            <p className="text-sm text-muted-foreground mt-3">Sign in to manage your store</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@centered101.com"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In →"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
