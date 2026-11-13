import Image from "next/image";

const links = [
  {
    label: "App Store",
    href: "https://apps.apple.com/gb/app/vineme/id6476884970",
    badge: "/store-badges/app-store-dark-en.svg",
  },
  {
    label: "Google Play",
    href: "https://play.google.com/store/apps/details?id=com.pilotlight.vineme",
    badge: "/store-badges/google-play-dark-en.svg",
  },
];

export default function DownloadCTA() {
  return (
    <section className="bg-brand-dark/5 px-5 py-12 sm:px-6 lg:py-20">
      <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-lg bg-[#2C2235] p-7 sm:p-10 lg:p-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-2/5 top-1/2 z-0 h-[383px] w-[383px] -translate-x-1/2 -translate-y-[calc(50%)] bg-contain bg-center bg-no-repeat md:-translate-y-1/2 sm:h-[800px] sm:w-[800px]"
          style={{
            backgroundImage:
              "url('/images/vineme-assets/LOGO/vineme_svg-07.svg')",
          }}
        />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-4xl font-black text-white">
            Ready to find your people?
          </h2>
          <p className="mt-4 text-lg text-white/75">
            Download VineMe and find your small group today.
          </p>
          <div className="mt-8 flex w-full flex-row items-center justify-evenly gap-2 md:hidden">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="flex justify-center"
              >
                <Image
                  src={link.badge}
                  alt={`Download on ${link.label}`}
                  width={162}
                  height={54}
                  className="h-auto w-[7.5rem] min-[390px]:w-[8.25rem] sm:w-[10.125rem]"
                />
              </a>
            ))}
          </div>
          <div className="mt-8 hidden items-center md:flex md:flex-col">
            <div className="rounded-lg border border-brand-dark/10 bg-white p-3 shadow-sm">
              <Image
                src="/images/vineme-qr.png"
                alt="QR code to download VineMe"
                width={200}
                height={200}
                className="h-[200px] w-[200px]"
              />
            </div>
            <p className="mt-4 rounded-full bg-white/90 px-4 py-2 text-lg font-medium leading-snug text-brand-dark">
              Scan to get started
            </p>
            <p className="mt-6 text-center text-sm font-medium text-white/60">
              Or find us on the App Store and Google Play.
            </p>
            <div className="mt-3 flex justify-center gap-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex justify-center"
                >
                  <Image
                    src={link.badge}
                    alt={`Download on ${link.label}`}
                    width={150}
                    height={50}
                    className="h-auto w-[9.25rem]"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
