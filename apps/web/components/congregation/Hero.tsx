import Image from "next/image";

const storeLinks = [
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
export default function Hero() {
  return (
    <section className="overflow-hidden px-5 pb-14 pt-6 sm:px-6 lg:pb-20 lg:pt-10">
      <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-2 lg:items-start">
        <div className="relative">
          <h1 className="font-heading text-5xl font-black leading-[1.05] text-brand-dark sm:text-6xl lg:text-7xl">
            Life is better in community.
          </h1>
          <p className="mt-5 text-2xl font-medium leading-tight text-brand-dark sm:text-3xl lg:mt-8 lg:text-4xl">
            Find yours here.
          </p>

          <div className="mt-8 flex w-full -translate-y-2 flex-row items-center justify-evenly gap-2 md:hidden">
            {storeLinks.map((link) => (
              <a key={link.href} href={link.href} className="flex">
                <Image
                  src={link.badge}
                  alt={`Download on ${link.label}`}
                  width={162}
                  height={54}
                  className="h-auto w-[11rem] min-[390px]:w-[12rem] sm:w-[14rem] lg:w-[16rem]"
                />
              </a>
            ))}
          </div>

          <div className="mt-10 hidden md:block">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-[-130px] top-[188px] -z-10 h-[750px] w-[750px] bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: "url('/images/vineme-logo-pink.png')" }}
            />

            <div className="relative z-10 flex items-end gap-8">
              <div className="flex shrink-0 flex-col items-center">
                <div className="shrink-0 rounded-lg border border-brand-dark/10 bg-white p-4 shadow-sm">
                  <Image
                    src="/images/vineme-qr.png"
                    alt="QR code to download VineMe"
                    width={280}
                    height={280}
                    className="h-[280px] w-[280px]"
                  />
                </div>
                <p className="mt-4 rounded-full bg-white/90 px-4 py-2 text-lg font-medium leading-snug text-brand-dark">
                  Scan to get started
                </p>
              </div>

              <div className="flex translate-y-2.5 flex-col items-start gap-4 pb-3">
                <div className="flex flex-col gap-3">
                  {storeLinks.map((link) => (
                    <a key={link.href} href={link.href} className="flex">
                      <Image
                        src={link.badge}
                        alt={`Download on ${link.label}`}
                        width={164}
                        height={55}
                        className="h-auto w-[10.25rem]"
                      />
                    </a>
                  ))}
                </div>
                <p className="max-w-[11rem] text-sm font-medium leading-snug text-brand-dark/60">
                  Or find us on the App Store and Google Play.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* MOBILE: two-phone fan */}
          <div className="relative mx-auto h-[420px] w-full max-w-sm md:hidden">
            <div className="absolute left-1/2 top-0 z-10 -translate-x-[calc(25%-25px)] rotate-[12deg]">
              <Image
                src="/images/app-screenshots/maps-iphone.png"
                alt="VineMe map view"
                width={1125}
                height={2279}
                className="h-auto w-[210px] drop-shadow-[0_18px_24px_rgba(44,34,53,0.22)]"
                priority
              />
            </div>
            <div className="absolute left-1/2 top-4 z-20 -translate-x-[calc(60%+25px)] -rotate-[8deg]">
              <Image
                src="/images/app-screenshots/manage-groups-iphone.png"
                alt="VineMe manage groups view"
                width={1125}
                height={2279}
                className="h-auto w-[230px] drop-shadow-[0_24px_30px_rgba(44,34,53,0.34)]"
                priority
              />
            </div>
          </div>

          <div className="relative mt-6 flex flex-col items-center md:hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[180px] -z-10 h-[550px] w-[550px] -translate-x-[60%] -translate-y-1/2 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/images/vineme-logo-pink.png')" }}
          />
          <div className="relative z-10 w-[13.2rem] rounded-lg border border-brand-dark/10 bg-white p-3 shadow-sm">
            <Image
              src="/images/vineme-qr.png"
              alt="QR code to download VineMe"
              width={200}
              height={200}
              className="h-auto w-full"
            />
          </div>
          <p className="relative z-10 mt-4 rounded-full bg-white/90 px-4 py-2 text-lg font-medium leading-snug text-brand-dark">
            Share VineMe
          </p>
        </div>

          {/* DESKTOP: three-phone fan */}
          <div className="relative hidden h-[560px] w-full translate-y-[10px] md:block lg:h-[590px]">
            <div className="absolute left-1/2 top-0 z-10 -translate-x-[calc(110%+25px)] -rotate-[14deg]">
              <Image
                src="/images/app-screenshots/maps-iphone.png"
                alt="VineMe map view"
                width={1125}
                height={2279}
                className="h-auto w-[209px] drop-shadow-[0_18px_24px_rgba(44,34,53,0.22)] lg:w-[228px]"
                priority
              />
            </div>
            <div className="absolute left-1/2 top-0 z-10 translate-x-[calc(10%+25px)] rotate-[14deg]">
              <Image
                src="/images/app-screenshots/home-page-iphone.png"
                alt="VineMe home page showing user's groups"
                width={1125}
                height={2279}
                className="h-auto w-[209px] drop-shadow-[0_18px_24px_rgba(44,34,53,0.22)] lg:w-[228px]"
                priority
              />
            </div>
            <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
              <Image
                src="/images/app-screenshots/manage-groups-iphone.png"
                alt="VineMe manage groups view"
                width={1125}
                height={2279}
                className="h-auto w-[228px] drop-shadow-[0_24px_30px_rgba(44,34,53,0.34)] lg:w-[251px]"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
