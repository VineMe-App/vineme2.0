"use client";

import { PersonAvatar } from "@/components/dashboard/PersonAvatar";
import {
  ChartColumn,
  ClipboardCheck,
  House,
  IdCard,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChurchSwitcher } from "@/components/dashboard/ChurchSwitcher";
import { useAdmin } from "@/lib/dashboard/admin-context";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  exact: boolean;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    exact: true,
    icon: House,
  },
  {
    href: "/dashboard/follow-ups",
    label: "Follow-ups",
    exact: false,
    icon: ClipboardCheck,
  },
  {
    href: "/dashboard/groups",
    label: "Groups",
    exact: false,
    icon: UsersRound,
  },
  {
    href: "/dashboard/members",
    label: "Members",
    exact: false,
    icon: IdCard,
  },
  {
    href: "/dashboard/reports",
    label: "Reports",
    exact: false,
    icon: ChartColumn,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    exact: false,
    icon: Settings,
  },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { fullName, avatarUrl } = useAdmin();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const applyHeight = () => {
      document.documentElement.style.setProperty(
        "--dashboard-nav-height",
        `${header.offsetHeight}px`,
      );
    };

    applyHeight();
    const observer = new ResizeObserver(applyHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur"
    >
      <nav
        aria-label="Dashboard"
        className="mx-auto flex w-full max-w-6xl items-center gap-4 px-5 sm:gap-8 sm:px-6"
      >
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center py-2"
          aria-label="VineMe dashboard home"
        >
          <Image
            src="/images/vineme-assets/LOGO/vineme_svg-04.svg"
            alt=""
            width={90}
            height={90}
            className="h-10 w-auto"
            priority
          />
          <Image
            src="/images/vineme-assets/LOGO/vineme_svg-05.svg"
            alt="VineMe"
            width={111}
            height={30}
            className="-ml-2 hidden h-5 w-auto translate-y-1.5 sm:block"
            priority
          />
        </Link>

        <ul className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto sm:gap-2">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-4 font-medium text-sm transition-colors",
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-1">
          <ChurchSwitcher />
          <Link
            href="/dashboard/profile"
            aria-label={`Your profile, ${fullName}`}
            aria-current={pathname === "/dashboard/profile" ? "page" : undefined}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <PersonAvatar name={fullName} src={avatarUrl} className="size-9" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
