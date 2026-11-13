import Image from "next/image";
import type { ReactNode } from "react";

type PhoneFrameProps = {
  image: string;
  alt: string;
  className?: string;
  children?: ReactNode;
};

export default function PhoneFrame({
  image,
  alt,
  className = "",
  children,
}: PhoneFrameProps) {
  return (
    <div
      className={`relative aspect-[958/1940] w-56 overflow-hidden rounded-[2.35rem] shadow-2xl shadow-brand-dark/25 ${className}`}
    >
      <div className="absolute inset-0 z-0">
        {image ? (
          <Image
            src={image}
            alt={alt}
            fill
            sizes="(max-width: 768px) 224px, 260px"
            className="object-cover object-center"
          />
        ) : children ? (
          children
        ) : (
          <div
            role="img"
            aria-label={alt}
            className="h-full w-full bg-gray-300"
          />
        )}
      </div>
      <Image
        src="/images/iphone-frame.svg"
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 768px) 224px, 260px"
        className="pointer-events-none z-10 object-cover"
      />
    </div>
  );
}
