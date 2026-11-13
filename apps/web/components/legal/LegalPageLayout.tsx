import Footer from "@/components/shared/Footer";
import type { ReactNode } from "react";

type LegalPageLayoutProps = {
  documentTitle: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPageLayout({
  documentTitle,
  lastUpdated,
  children,
}: LegalPageLayoutProps) {
  return (
    <>
      <article className="px-5 py-10 sm:px-6 lg:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <p className="text-sm font-bold text-brand-dark/60">
            VineMe International Limited
          </p>
          <h1 className="mt-2 font-heading text-3xl font-black text-brand-dark sm:text-4xl">
            {documentTitle}
          </h1>
          <p className="mt-2 text-sm text-brand-dark/60">
            Last updated: {lastUpdated}
          </p>
          <div className="mt-10 space-y-5 text-base leading-7 text-brand-dark/85">
            {children}
          </div>
        </div>
      </article>
      <Footer />
    </>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-10 scroll-mt-24 font-heading text-xl font-black text-brand-pink first:mt-0 sm:text-2xl">
      {children}
    </h2>
  );
}

export function LegalH3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-6 font-heading text-lg font-black text-brand-pink">
      {children}
    </h3>
  );
}

export function LegalP({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={className}>{children}</p>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-6">{children}</ul>;
}

export function LegalLi({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export function LegalAddress({ children }: { children: ReactNode }) {
  return (
    <address className="not-italic text-brand-dark/85">{children}</address>
  );
}
