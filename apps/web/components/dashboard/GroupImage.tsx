import { UsersRoundIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface GroupImageProps {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  /** Photo runs to the card edges. Top corners follow the card radius. */
  flush?: boolean;
}

export function GroupImage({
  src,
  alt,
  className,
  sizes,
  flush = false,
}: GroupImageProps) {
  const radius = flush
    ? "rounded-t-[calc(var(--radius-2xl)-1px)]"
    : "rounded-[calc(var(--outer-radius,var(--radius-2xl))-var(--inset,0.5rem)-1px)]";
  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden bg-muted",
        radius,
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes={sizes ?? "(min-width: 768px) 50vw, 100vw"}
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <UsersRoundIcon aria-hidden="true" className="size-8" />
          <span className="sr-only">No photo for {alt}</span>
        </div>
      )}
    </div>
  );
}
