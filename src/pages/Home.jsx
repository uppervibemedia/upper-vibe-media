import React from "react";
import HeroSection from "../components/home/HeroSection";
import FeaturedSection from "../components/home/FeaturedSection";
import DifferenceSection from "../components/home/DifferenceSection";
import PremiumPromo from "../components/home/PremiumPromo";
import TestimonialsSection from "../components/home/TestimonialsSection";
import Footer from "../components/shared/Footer";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <FeaturedSection />
      <DifferenceSection />
      <PremiumPromo />
      <TestimonialsSection />
      <Footer />
    </div>
  );
}