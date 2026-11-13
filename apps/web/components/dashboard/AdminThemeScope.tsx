"use client";

import { useEffect } from "react";

interface AdminThemeScopeProps {
  classNames: string;
}

// coss portals (Sheet, Select, ...) render on <body>, outside the dashboard
// layout wrapper. Mirror the theme classes onto <body> while on /dashboard so
// portaled UI gets the same tokens and font. Removed again on leaving.
export function AdminThemeScope({ classNames }: AdminThemeScopeProps) {
  useEffect(() => {
    const classes = classNames.split(" ").filter(Boolean);
    document.body.classList.add(...classes);

    return () => {
      document.body.classList.remove(...classes);
    };
  }, [classNames]);

  return null;
}
