"use client";

import { useEffect } from "react";

export default function ResetPage() {
  useEffect(() => {
    localStorage.clear();
    window.location.href = "/";
  }, []);

  return (
    <section className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 text-center">
      <p className="font-heading text-3xl font-black text-brand-dark">
        Resetting...
      </p>
    </section>
  );
}
