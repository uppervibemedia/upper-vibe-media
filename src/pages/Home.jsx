import React from "react";
import HeroSection from "../components/home/HeroSection";
import StartHereSection from "../components/home/StartHereSection";
import FeaturedSessionsSection from "../components/home/FeaturedSessionsSection";
import EducationalVideosSection from "../components/home/EducationalVideosSection";
import WhyListenHereSection from "../components/home/WhyListenHereSection";
import VaultCTASection from "../components/home/VaultCTASection";
import Footer from "../components/shared/Footer";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <StartHereSection />
      <FeaturedSessionsSection />
      <EducationalVideosSection />
      <WhyListenHereSection />
      <VaultCTASection />
      <Footer />
    </div>
  );
}