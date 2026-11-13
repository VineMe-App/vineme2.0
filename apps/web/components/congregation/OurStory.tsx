"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type StoryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  kind: "main" | "sub";
};

const mainImage: StoryImage = {
  src: "/images/find-our-story/main.png",
  alt: "VineMe community gathering together outdoors",
  width: 3024,
  height: 1401,
  kind: "main",
};

const subImages: StoryImage[] = [
  {
    src: "/images/find-our-story/sub-1.png",
    alt: "VineMe community group gathering indoors",
    width: 2048,
    height: 1280,
    kind: "sub",
  },
  {
    src: "/images/find-our-story/sub-2.png",
    alt: "VineMe community members spending time together",
    width: 2829,
    height: 1768,
    kind: "sub",
  },
  {
    src: "/images/find-our-story/sub-3.png",
    alt: "VineMe community celebrating together",
    width: 3024,
    height: 1890,
    kind: "sub",
  },
];

export default function OurStory() {
  const [selectedImage, setSelectedImage] = useState<StoryImage | null>(null);

  useEffect(() => {
    if (!selectedImage) {
      document.body.style.overflow = "";
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedImage(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedImage]);

  return (
    <>
      <section
        id="story"
        className="bg-brand-dark/5 px-5 pb-14 pt-8 sm:px-6 lg:pb-16 lg:pt-16"
      >
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="text-center font-heading text-4xl font-black text-brand-dark sm:text-5xl">
            Built from what we&apos;ve received.
          </h2>

          <div className="mt-4 grid items-start gap-10 lg:mt-8 lg:grid-cols-[1fr_0.95fr]">
            <div className="order-2 lg:order-1">
            <div className="lg:hidden">
              <div className="overflow-hidden rounded-lg shadow-xl shadow-brand-dark/10">
                <Image
                  src={mainImage.src}
                  alt={mainImage.alt}
                  width={mainImage.width}
                  height={mainImage.height}
                  sizes="100vw"
                  className="h-auto w-full"
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <button
                type="button"
                onClick={() => setSelectedImage(mainImage)}
                className="block w-full overflow-hidden rounded-lg shadow-xl shadow-brand-dark/10 transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-brand-pink focus:ring-offset-2 focus:ring-offset-white"
                aria-label="Open main story image"
              >
                <Image
                  src={mainImage.src}
                  alt={mainImage.alt}
                  width={mainImage.width}
                  height={mainImage.height}
                  sizes="52vw"
                  className="h-auto w-full cursor-zoom-in"
                />
              </button>

              <div className="mt-5 grid grid-cols-3 gap-5">
                {subImages.map((image, index) => (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className="block overflow-hidden rounded-lg shadow-lg shadow-brand-dark/10 transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-brand-pink focus:ring-offset-2 focus:ring-offset-white"
                    aria-label={`Open supporting story image ${index + 1}`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes="17vw"
                      className="h-auto w-full cursor-zoom-in"
                    />
                  </button>
                ))}
              </div>
            </div>
            </div>

            <div className="order-1 lg:order-2">
            <p className="mx-auto mb-2 max-w-2xl text-center text-lg leading-8 text-brand-dark/80 sm:text-xl lg:mx-0 lg:mb-4 lg:text-left">
            I am the Vine, you are the branches
            <span className="block text-brand-pink lg:inline">
              {" "}John 15:5
            </span>
          </p>
              <div className="space-y-4 text-lg font-normal leading-8 text-brand-dark/70">
              <p>
                For years, our connect groups have been the most incredible
                source of family, friendship and love — it&apos;s genuinely
                difficult to name a better expression of God&apos;s love in
                action. We know first-hand how transformative being needed and
                known is, but we know of friends who attend churches without
                ever finding that sense of belonging. The easiest place to get
                lost is in a crowd.
              </p>
              <p>
                VineMe exists so that more people can experience what
                we&apos;ve experienced. It&apos;s been running at HTB Onslow
                Square for over 18 months. We&apos;re still learning, still
                building, still shaping it alongside the people using it.
              </p>
              <p>
                We&apos;d love for you to be part of the journey. Let&apos;s
                build community together.
              </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedImage ? (
        <div
          className="fixed inset-0 z-50 hidden backdrop-blur-[3px] lg:flex lg:items-center lg:justify-center"
          onClick={() => setSelectedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded story image"
        >
          <div
            className={`relative ${
              selectedImage.kind === "main"
                ? "w-[78vw] max-w-[1500px]"
                : "w-[48vw] max-w-[1100px]"
            }`}
          >
            <button
              type="button"
              aria-label="Close expanded image"
              className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20"
              onClick={() => setSelectedImage(null)}
            >
              <span className="relative block h-5 w-5">
                <span className="absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 rotate-45 bg-current" />
                <span className="absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 -rotate-45 bg-current" />
              </span>
            </button>
            <div className="overflow-hidden rounded-lg shadow-[0_30px_80px_rgba(0,0,0,0.38)]">
              <Image
                src={selectedImage.src}
                alt={selectedImage.alt}
                width={selectedImage.width}
                height={selectedImage.height}
                sizes={selectedImage.kind === "main" ? "78vw" : "48vw"}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
