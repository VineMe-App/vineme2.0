import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.9", "10.179.52.137", "10.22.47.137"],
  async redirects() {
    return [
      // Reports was renamed Insights (INS-1). Query strings carry over.
      {
        source: "/dashboard/reports",
        destination: "/dashboard/insights",
        permanent: false,
      },
    ];
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy:
      "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default withSentryConfig(nextConfig, {
  org: "vineme",
  project: "vineme-web",
  sentryUrl: "https://de.sentry.io/",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
