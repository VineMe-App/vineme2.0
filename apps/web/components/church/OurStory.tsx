import Image from "next/image";

export default function OurStory() {
  return (
    <section className="bg-brand-dark/5 px-5 py-8 sm:px-6 lg:py-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-10 md:grid-cols-[3fr_2fr] md:items-center lg:gap-16">
          <div>
            <div className="md:flex md:items-start md:justify-between md:gap-6">
              <div>
                <h2 className="font-heading text-4xl font-black text-brand-dark">
                  Our Story
                </h2>
                <p className="mt-4 text-xl font-bold text-brand-dark/60">
                  A Faith Project, Not a Tech Project
                </p>
              </div>
              <div className="hidden rounded-lg bg-white px-5 py-4 shadow-sm md:inline-flex md:shrink-0">
                <p>
                  <span className="block font-heading text-3xl font-black text-brand-pink">
                    18 months
                  </span>
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-brand-dark/55">
                    trialling at HTB
                  </span>
                </p>
              </div>
            </div>
            <p className="mt-5 text-lg leading-8 text-brand-dark/80">
              VineMe was born out of a passion and a desire to see people enjoy
              the joy and fruitfulness we have been so blessed to experience in
              our small groups. We know first-hand how transformative being
              needed and known is, and we want every Christian to find that kind
              of belonging. We are deeply grateful to Holy Trinity Brompton, who
              walked with us for 18 months as we built and tested VineMe inside
              a real church family. What started as an experiment is now an
              active part of HTB Onslow Square&apos;s small group life. Now, we
              are opening VineMe to the wider Church, <em>big C</em>, and to
              leaders who share our conviction that the Body of Christ is called
              to live out our faith together.
            </p>
            <div className="mt-8 inline-flex rounded-lg bg-white px-5 py-4 shadow-sm md:hidden">
              <p>
                <span className="block font-heading text-3xl font-black text-brand-pink">
                  18 months
                </span>
                <span className="text-xs font-black uppercase tracking-[0.18em] text-brand-dark/55">
                  trialling at HTB
                </span>
              </p>
            </div>
          </div>

          <div className="w-full">
            <div className="overflow-hidden rounded-lg shadow-xl shadow-brand-dark/10 md:w-[105%] md:max-w-none md:translate-y-[20%]">
              <Image
                src="/images/church-our-story-focus-wheel.jpeg"
                alt="Church focus wheel close-up during a service"
                width={720}
                height={1280}
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
