import localFont from "next/font/local";
import { AdminGate } from "@/components/dashboard/AdminGate";
import { AdminThemeScope } from "@/components/dashboard/AdminThemeScope";

// Cal Sans v2 variable (SIL OFL 1.1), from the official `cal-sans` npm package.
// Loaded here, not in the root layout, so marketing pages never download it.
const calSans = localFont({
  src: "../fonts/cal-sans/CalSansVF.woff2",
  variable: "--font-cal-sans",
  weight: "400 700",
  display: "swap",
});

const themeClassNames = `admin-theme ${calSans.variable}`;

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={themeClassNames}>
      <AdminThemeScope classNames={themeClassNames} />
      <AdminGate>{children}</AdminGate>
    </div>
  );
}
