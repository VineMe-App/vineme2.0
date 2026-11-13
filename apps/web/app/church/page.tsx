import ContactForm from "@/components/church/ContactForm";
import FAQ from "@/components/church/FAQ";
import Hero from "@/components/church/Hero";
import LeakageSection from "@/components/church/LeakageSection";
import OurStory from "@/components/church/OurStory";
import ProductOverview from "@/components/church/ProductOverview";
import WelcomePoints from "@/components/church/WelcomePoints";
import Footer from "@/components/shared/Footer";

export default function ChurchPage() {
  return (
    <>
      <Hero />
      <LeakageSection />
      <WelcomePoints />
      <ProductOverview />
      <FAQ />
      <OurStory />
      <ContactForm />
      <Footer />
    </>
  );
}
