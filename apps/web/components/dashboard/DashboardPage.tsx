import { cn } from "@/lib/utils";

/**
 * The container every dashboard page sits in, so spacing and width are set in
 * one place. `wide` is for pages that need more room, such as the Groups map.
 */
export function DashboardPage({
  children,
  wide = false,
  className,
  innerClassName,
}: {
  children: React.ReactNode;
  wide?: boolean;
  /** Extra classes for the outer section. */
  className?: string;
  /** Extra classes for the centred inner container. */
  innerClassName?: string;
}) {
  return (
    <section className={cn("px-5 py-6 sm:px-6 lg:py-8", className)}>
      <div
        className={cn(
          "mx-auto w-full",
          wide ? "max-w-[90rem]" : "max-w-6xl",
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
