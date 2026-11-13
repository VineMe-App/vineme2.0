const steps = [
  {
    icon: (
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="M20 21a8 8 0 0 0-16 0" />
      </>
    ),
    title: "The First Contact Gap",
    description:
      "People want to connect, but the next step isn't obvious or easy. The responsibility ends up on the individual rather than the community around them.",
  },
  {
    icon: (
      <>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </>
    ),
    title: "The Communication Gap",
    description:
      "Messages get passed around, quietly sit in an inbox, or they funnel to one exhausted staff member. The congregation never gets the chance to play its part.",
  },
  {
    icon: (
      <>
        <circle cx="10" cy="7" r="4" />
        <path d="M10.3 15H7a4 4 0 0 0-4 4v2" />
        <circle cx="17" cy="17" r="3" />
        <path d="m21 21-1.9-1.9" />
      </>
    ),
    title: "The Follow-up Gap",
    description:
      "After the initial connection, it’s hard to know who actually got plugged in. Without visibility, people wait, feel forgotten, and quietly slip through the cracks.",
  },
];

export default function LeakageSection() {
  return (
    <section className="bg-brand-dark/5 px-5 pb-14 pt-8 sm:px-6 lg:pb-24 lg:pt-16">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="font-heading text-3xl font-black leading-tight text-brand-dark sm:text-4xl">
            Jesus spoke to thousands.
            <span className="block">He discipled twelve.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-xl font-medium leading-8 text-gray-600 sm:text-2xl md:max-w-5xl md:whitespace-nowrap">
            <span className="block md:inline">Small groups are where</span>
            <span className="block md:inline md:ml-1">
              faith stops being spectated
            </span>
            <span className="block md:inline md:ml-1">and starts being lived.</span>
          </p>
          <p className="mx-auto mt-5 max-w-3xl text-xl font-medium leading-8 text-gray-600 sm:text-2xl">
            <span className="block">
              But only 30% of congregations are in a small group.
            </span>
            <span className="block">
              The other 70% aren&apos;t uninterested, they are simply
            </span>
            <span className="block font-black text-brand-dark">
              stuck in the gap.
            </span>
          </p>
        </div>
        <p className="mx-auto mt-5 max-w-3xl text-center text-xl font-medium leading-8 text-gray-600 sm:text-2xl">
          This gap shows up in three places.
        </p>
        <div className="mx-auto mt-5 grid max-w-5xl gap-5 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <div className="flex h-full flex-col items-center rounded-lg bg-white px-5 py-8 text-center shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-pink/12 text-brand-pink">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    {step.icon}
                  </svg>
                </div>
                <h3 className="mt-5 text-xl font-black text-brand-dark">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-brand-dark/65">
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 ? (
                <div className="absolute right-[-22px] top-1/2 z-10 hidden -translate-y-1/2 text-4xl font-black text-brand-pink md:block">
                  &rarr;
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
