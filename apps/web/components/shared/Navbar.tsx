"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navItems = [
  { href: "/church", label: "I lead a church" },
  { href: "/find", label: "I'm looking for a group" },
  { href: "/login", label: "Login" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [isOpen]);

  if (pathname.startsWith("/dashboard")) return null;

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-50 border-b border-brand-dark/10 bg-white/95 backdrop-blur"
    >
      <nav className="mx-auto w-full max-w-6xl px-5 py-2 sm:px-6 sm:py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/images/vineme-assets/LOGO/vineme_svg-04.svg"
              alt="VineMe logo"
              width={90}
              height={90}
              className="h-16 w-auto sm:-ml-6 sm:h-[3.375rem]"
              priority
            />
            <Image
              src="/images/vineme-assets/LOGO/vineme_svg-05.svg"
              alt="VineMe"
              width={111}
              height={30}
              className="-ml-4 h-6 w-auto translate-y-2.5 sm:-ml-4 sm:h-[1.6875rem] sm:translate-y-2.5"
              priority
            />
          </div>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-brand-dark/15 text-brand-dark md:hidden"
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label="Toggle navigation"
            onClick={() => {
              setIsOpen((current) => !current);
            }}
          >
            <span className="relative block h-5 w-5">
              <span
                className={`absolute left-0 top-1 block h-0.5 w-5 bg-current transition-transform ${
                  isOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 bg-current transition-opacity ${
                  isOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute bottom-1 left-0 block h-0.5 w-5 bg-current transition-transform ${
                  isOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </span>
          </button>
          <div className="hidden items-center gap-8 text-sm font-bold md:flex md:text-base">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors ${
                    isActive
                      ? "text-brand-pink"
                      : "text-brand-dark hover:text-brand-pink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      <div
        id="mobile-navigation"
        className={`absolute left-0 right-0 top-full z-40 overflow-hidden border-b border-brand-dark/10 bg-white transition-[max-height,opacity] duration-200 md:hidden ${
          isOpen ? "max-h-56 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mx-auto grid w-full max-w-6xl py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`w-full px-5 py-4 text-left font-black transition-colors ${
                  isActive
                    ? "text-brand-pink"
                    : "text-brand-dark hover:text-brand-pink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
