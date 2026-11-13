import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import PrivacyPolicyContent from "@/components/legal/PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "Privacy Notice | VineMe",
  description:
    "How VineMe International Limited collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      documentTitle="Customer Privacy Notice"
      lastUpdated="20 March 2026"
    >
      <PrivacyPolicyContent />
    </LegalPageLayout>
  );
}
