import Image from "next/image";

type TestimonialProps = {
  quote: string;
  attribution: string;
};

function ProductTestimonial({ quote, attribution }: TestimonialProps) {
  return (
    <figure className="relative max-w-xl border-l-4 border-brand-pink bg-brand-dark/5 px-6 py-7">
      <span
        aria-hidden="true"
        className="absolute -left-1 top-0 -translate-y-1/2 font-heading text-7xl font-black leading-none text-brand-pink"
      >
        &ldquo;
      </span>
      <blockquote className="text-lg font-medium leading-7 text-brand-dark sm:text-xl sm:leading-8">
        {quote}
      </blockquote>
      <figcaption className="mt-4 text-sm font-bold text-brand-dark/55">
        {attribution}
      </figcaption>
    </figure>
  );
}

export default function ProductOverview() {
  return (
    <section className="bg-brand-dark/5 px-6 pt-14 pb-4 md:py-16">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 md:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        <div>
          <h2 className="font-heading text-5xl font-black leading-[1.05] text-brand-dark sm:text-6xl lg:text-7xl">
            Meet VineMe.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-dark/80 sm:text-xl">
            The small group app built{" "}
            <span className="text-brand-pink">for the congregation</span> — to
            serve the church.
          </p>
          <div className="mt-10 space-y-8">
            <ProductTestimonial
              quote="For the first time, we all speak the same language.
              Before, we had to chase with emails. Now we can see exactly who’s connected and who still needs a place."
              attribution="Service Pastor"
            />
            <ProductTestimonial
              quote="Bless you for this amazing app — it really meets the need. It's so easy to manage requests, and the functions are so well thought through!"
              attribution="Group Leader"
            />
          </div>
        </div>

        <div className="flex flex-col">
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

        {/* DESKTOP: three-phone fan */}
        <div className="relative hidden h-[560px] w-full translate-x-[50px] translate-y-[50px] md:block lg:h-[590px]">
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

        <p className="-mt-8 max-w-2xl text-center text-lg leading-8 text-brand-dark/80 sm:text-xl md:mt-2 md:translate-x-[50px]">
          I am the Vine, you are the branches
          <span className="block text-brand-pink md:inline">
            {" "}John 15:5
          </span>
        </p>
        </div>
      </div>
    </section>
  );
}
