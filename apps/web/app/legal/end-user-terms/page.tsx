import type { Metadata } from "next";
import EndUserTermsContent from "@/components/legal/EndUserTermsContent";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "End User Terms and Conditions | VineMe",
  description:
    "Terms and conditions for individual users of the VineMe app.",
};

export default function EndUserTermsPage() {
  return (
    <LegalPageLayout
      documentTitle="End User Terms and Conditions"
      lastUpdated="20 March 2026"
    >
      <EndUserTermsContent />
    </LegalPageLayout>
  );
}
