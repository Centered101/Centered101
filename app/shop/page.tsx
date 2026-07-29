import Navbar from "@/components/shop/Navbar";
import HeroSection from "@/components/shop/HeroSection";
import CategoriesSection from "@/components/shop/CategoriesSection";
import TrendingProducts from "@/components/shop/TrendingProducts";
import PromotionSection from "@/components/shop/PromotionSection";
import VideoSection from "@/components/shop/VideoSection";
import PartnerSection from "@/components/shop/PartnerSection";
import Footer from "@/components/shop/Footer";
import CartDrawer from "@/components/shop/CartDrawer";

export default function ShopHomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <CartDrawer />
      <main>
        <HeroSection />
        <CategoriesSection />
        <TrendingProducts />
        <PromotionSection />
        <VideoSection />
        <PartnerSection />
      </main>
      <Footer />
    </div>
  );
}
