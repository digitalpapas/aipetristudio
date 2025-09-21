import Header from "@/components/marketing/Header";
import Hero from "@/components/marketing/Hero";
import HowItWorks from "@/components/marketing/HowItWorks";
import FeaturesBento from "@/components/marketing/FeaturesBento";
import ContentFactory from "@/components/marketing/ContentFactory";
import Pricing from "@/components/marketing/Pricing";
import Testimonials from "@/components/marketing/Testimonials";
import FinalCTA from "@/components/marketing/FinalCTA";
import Footer from "@/components/marketing/Footer";
import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "AI Исследователь аудитории — AIPetri Studio";
  }, []);

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AI Исследователь аудитории',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'RUB',
    },
    brand: {
      '@type': 'Brand',
      name: 'AIPetri Studio'
    },
    description: 'AI исследование аудитории за 3 минуты. GPT‑4, 50+ параметров, точность 97%.'
  };

  return (
    <div>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <FeaturesBento />
        <ContentFactory />
        <Pricing />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
    </div>
  );
};

export default Index;
