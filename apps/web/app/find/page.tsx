import DownloadCTA from "@/components/congregation/DownloadCTA";
import Hero from "@/components/congregation/Hero";
import OurStory from "@/components/congregation/OurStory";
import ReferralFlow from "@/components/congregation/ReferralFlow";
import Testimonials from "@/components/congregation/Testimonials";
import TrustSection from "@/components/congregation/TrustSection";
import Footer from "@/components/shared/Footer";

export default function FindPage() {
  return (
    <>
      <Hero />
      <ReferralFlow />
      <Testimonials />
      <OurStory />
      <TrustSection />
      <DownloadCTA />
      <Footer />
    </>
  );
}
