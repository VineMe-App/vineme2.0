import Image from "next/image";

const bullets = [
  {
    title: "Empower the Congregation",
    text: "Give every member the ability to see groups and refer friends directly on a Sunday.",
  },
  {
    title: "Support Your Leaders",
    text: (
      <>
        Identify when group leaders are overwhelmed.
        <br />
        See who has outstanding requests and who has not been followed up
        with in weeks.
      </>
    ),
  },
  {
    title: 'Eliminate the "Pending" Abyss',
    text: "For the first time, your pastoral team has full visibility of the connection process, ensuring no one spends years at your church still feeling like an outsider.",
  },
];

export default function WelcomePoints() {
  return (
    <section className="relative isolate overflow-hidden bg-[#f3ebea] px-5 pb-14 pt-8 sm:px-6 lg:pb-24 lg:pt-16">
      <Image
        src="/images/welcome-points-bg.jpeg"
        alt=""
        fill
        className="object-cover object-center md:origin-right md:scale-[1.2] md:object-contain md:object-right md:translate-y-[30px] -z-10 md:opacity-80 -z-10"
        priority
      />
      <div className="absolute inset-y-0 left-0 w-full lg:w-3/5 bg-gradient-to-r from-white via-white/85 to-transparent -z-[5]" />
      <div className="mx-auto w-full max-w-6xl">
        <h2 className="font-heading text-5xl font-black leading-[1.05] text-brand-dark sm:text-6xl lg:text-7xl">
          Turn one welcome{"\u00A0"}wall into{" "}
          <span className="text-brand-pink">one{"\u00A0"}hundred</span>.
        </h2>
        <div className="mt-4 grid lg:grid-cols-[0.5fr_0.5fr] lg:gap-12">
          <div className="min-w-0 max-w-xl">
            <div className="rounded-xl border border-brand-pink bg-white/75 p-5 text-lg leading-8 text-brand-dark/80 sm:text-xl md:rounded-none md:border-0 md:bg-transparent md:p-0">
              <p>Every member a welcome point. Every Sunday an invitation.</p>
              <p className="mt-2">
                VineMe equips your whole congregation to stand in the gap.
              </p>
            </div>
            <div className="mt-9 grid gap-4 md:gap-6">
              {bullets.map((bullet) => (
                <div
                  key={bullet.title}
                  className="flex min-w-0 gap-4 rounded-xl border border-brand-pink bg-white/75 p-5 md:rounded-none md:border-0 md:bg-transparent md:p-0"
                >
                  <Image
                    src="/images/vineme-assets/LOGO/vineme_svg-02.svg"
                    alt=""
                    aria-hidden="true"
                    width={24}
                    height={24}
                    className="mt-1 h-6 w-6 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-black leading-7 text-brand-dark">
                      {bullet.title}
                    </p>
                    <p className="leading-7 text-brand-dark/75">
                      {bullet.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
