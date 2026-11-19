const steps = [
  {
    title: "Find a group",
    text: "Browse groups that fit your life. See which groups your friends are in. Or start your own.",
    icon: <path d="M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M16 11h6" />,
  },
  {
    title: "Request or refer",
    text: "Tap to send a request, or refer a friend directly to the group's leader.",
    icon: <path d="M4 5h16v10H7l-3 3V5ZM14 10h5M16 8l3 2-3 2" />,
  },
  {
    title: "Meet and belong",
    text: "The leaders get your request directly. No central inbox, no waiting weeks to hear back, no quietly being forgotten.",
    icon: <path d="m8 12 3 3 6-6M4 12l3 3 6-6" />,
  },
];

export default function ReferralFlow() {
  return (
    <section id="referral" className="bg-brand-dark/5 px-5 pb-14 pt-8 sm:px-6 lg:pb-18 lg:pt-16">
      <div className="mx-auto w-full max-w-6xl text-center">
        <h2 className="font-heading text-4xl font-black text-brand-dark sm:text-5xl">
          Let&apos;s make a big church feel small.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-brand-dark/65">
          Get plugged in. Get someone else plugged in.
        </p>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg bg-brand-dark/5 text-brand-pink">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  {step.icon}
                </svg>
              </div>
              <h3 className="mt-8 text-2xl font-black text-brand-dark">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-4 leading-7 text-brand-dark/65">{step.text}</p>
              {index < steps.length - 1 ? (
                <div className="absolute right-[-18%] top-10 hidden h-px w-24 bg-brand-pink/15 md:block" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
