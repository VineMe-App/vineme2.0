"use client";

import Image from "next/image";

export default function Hero() {
  const handleScrollToContact = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const contactSection = document.getElementById("contact");
    contactSection?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="px-5 pb-14 pt-8 sm:px-6 lg:pb-24 lg:pt-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h1 className="font-heading text-5xl font-black leading-[1.05] text-brand-dark sm:text-6xl lg:text-7xl">
            We don&apos;t have a capacity problem. We have a{" "}
            <span className="text-brand-pink">connection gap.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-brand-dark/80 sm:text-xl">
          Your church is growing, but growth shifts the pastoral problem.
          More people, same few hands, and the gap between Sunday and real belonging gets wider.
          </p>
          <div className="mt-8">
            <a
              href="#contact"
              onClick={handleScrollToContact}
              className="block w-full rounded-md bg-brand-pink px-6 py-4 text-center font-black text-white shadow-lg shadow-brand-pink/20 transition-colors hover:bg-brand-dark sm:inline-block sm:w-auto"
            >
              See VineMe in action
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="relative aspect-[1.08/1] overflow-hidden rounded-lg shadow-2xl shadow-brand-dark/10">
            <Image
              src="/images/church-hero-interior.png"
              alt="Interior photograph of a UK church"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-center"
              priority
            />
          </div>
          <div className="absolute -bottom-8 left-5 max-w-xs rounded-lg border-l-4 border-brand-pink bg-white p-5 shadow-xl shadow-brand-dark/15 lg:left-auto lg:right-[+8px]">
            <p className="text-base font-bold leading-6 text-brand-dark">
            Every week a church goes without a clear connection pathway,
            faithful congregation still feel like outsiders.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
