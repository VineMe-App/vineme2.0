"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

const STORAGE_KEY = "vineme-entry-choice";
type AudienceChoice = "church" | "find" | "login";

export default function EntryModal() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const onHome = window.location.pathname === "/";
    if (!onHome) return;

    const stored = localStorage.getItem(STORAGE_KEY) as AudienceChoice | null;
    if (stored === "church" || stored === "find" || stored === "login") {
      window.location.href = `/${stored}`;
    } else {
      const frame = window.requestAnimationFrame(() => setChecked(true));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  const handleChoice = (c: AudienceChoice) => {
    localStorage.setItem(STORAGE_KEY, c);
    window.location.href = `/${c}`;
  };

  if (!checked) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-dark px-6 py-8">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-xl p-6 text-center text-white sm:p-8">
          <Image
            src="/images/vineme-assets/LOGO/vineme_svg-09.svg"
            alt="VineMe"
            width={960}
            height={288}
            className="mx-auto mb-6 h-60 w-auto sm:mb-8 sm:h-72"
            priority
          />
          <h2 className="font-heading text-2xl font-black sm:text-4xl">
            Connect and Belong
          </h2>
          <div className="mt-8 flex flex-col gap-4">
            <button
              type="button"
              onClick={() => handleChoice("church")}
              className="min-h-12 w-full rounded-md border border-brand-pink bg-brand-pink px-6 py-3 font-bold text-white transition-colors hover:bg-white hover:text-brand-pink"
            >
              I lead a church
            </button>
            <button
              type="button"
              onClick={() => handleChoice("find")}
              className="min-h-12 w-full rounded-md border border-brand-pink bg-brand-pink px-6 py-3 font-bold text-white transition-colors hover:bg-white hover:text-brand-pink"
            >
              I&apos;m looking for a group
            </button>
            <button
              type="button"
              onClick={() => handleChoice("login")}
              className="min-h-12 w-full rounded-md border border-white bg-white px-6 py-3 font-bold text-brand-pink transition-colors hover:border-brand-pink hover:bg-brand-pink hover:text-white"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
