import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import CartDrawer from "@/components/shop/CartDrawer";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <CartDrawer />
      <main className="container mx-auto py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 28, 2026</p>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By using shop.centered101.com, you agree to these Terms of Service and all applicable laws
              and regulations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. Account Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities under your account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. Orders and Payments</h2>
            <p>
              All orders are subject to availability and confirmation. Prices, promotions, and
              product details may change without prior notice.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Prohibited Use</h2>
            <p>
              You agree not to misuse the website, attempt unauthorized access, disrupt services,
              or use the platform for fraudulent or unlawful activities.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">5. Intellectual Property</h2>
            <p>
              All content on this website, including logos, text, and media, is owned by or
              licensed to shop.centered101.com and is protected by intellectual property laws.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">6. Limitation of Liability</h2>
            <p>
              shop.centered101.com is not liable for indirect, incidental, or consequential damages arising
              from your use of the platform, to the extent permitted by law.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">7. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of the platform after
              updates indicates acceptance of the revised terms.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
