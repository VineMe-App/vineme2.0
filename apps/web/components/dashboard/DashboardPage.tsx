import { cn } from "@/lib/utils";

/**
 * Shared by the page container and the dashboard header, so the header's
 * logo and avatar line up with the page content edges. The gutter sits
 * outside the max width, so the content box is exactly `max-w-6xl` wide.
 */
export const dashboardGutter = "px-5 sm:px-6";
export const dashboardMaxWidth = "max-w-6xl";
export const dashboardWideMaxWidth = "max-w-[90rem]";

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
    <section className={cn(dashboardGutter, "py-6 lg:py-8", className)}>
      <div
        className={cn(
          "mx-auto w-full",
          wide ? dashboardWideMaxWidth : dashboardMaxWidth,
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
