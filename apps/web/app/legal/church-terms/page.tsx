import type { Metadata } from "next";
import ChurchTermsContent from "@/components/legal/ChurchTermsContent";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Church Pilot Agreement | VineMe",
  description:
    "Church Pilot Agreement between VineMe International Limited and participating churches.",
};

export default function ChurchTermsPage() {
  return (
    <LegalPageLayout
      documentTitle="Church Pilot Agreement"
      lastUpdated="20 March 2026"
    >
      <ChurchTermsContent />
    </LegalPageLayout>
  );
}
