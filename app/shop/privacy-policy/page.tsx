import Navbar from "@/components/shop/Navbar";
import Footer from "@/components/shop/Footer";
import CartDrawer from "@/components/shop/CartDrawer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <CartDrawer />
      <main className="container mx-auto py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 28, 2026</p>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>
              We collect information you provide directly such as your name, email address,
              shipping details, and payment-related metadata when you create an account, place
              an order, or contact support.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">2. How We Use Information</h2>
            <p>
              Your data is used to process orders, provide customer support, improve website
              performance, prevent fraud, and communicate important service updates.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">3. Cookies and Analytics</h2>
            <p>
              We may use cookies and analytics tools to understand usage patterns and improve
              user experience. You can manage cookies through your browser settings.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">4. Data Sharing</h2>
            <p>
              We do not sell personal data. Information may be shared only with trusted service
              providers required for payment processing, logistics, and infrastructure operations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
            <p>
              We apply reasonable administrative and technical safeguards to protect your
              information. However, no method of transmission or storage is fully secure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">6. Your Rights</h2>
            <p>
              You can request access, correction, or deletion of your personal data by contacting
              us through our support channels.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">7. Contact Us</h2>
            <p>
              If you have questions about this policy, please contact the shop.centered101.com support
              team.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
