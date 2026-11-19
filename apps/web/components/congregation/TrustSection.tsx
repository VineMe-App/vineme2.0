const items = [
  {
    title: "Permission-Based",
    text: "Your contact details are only shared with a leader when you explicitly ask to join their group.",
  },
  {
    title: "Secure Data",
    text: "VineMe is ICO registered and follows strict UK industry standards for data protection.",
  },
  {
    title: "Verified Leaders",
    text: "Every group on VineMe is vetted and approved by your church's pastoral team.",
  },
];

export default function TrustSection() {
  return (
    <section id="trust" className="bg-white px-5 pb-14 pt-8 sm:px-6 lg:pb-16 lg:pt-16">
      <div className="mx-auto w-full max-w-5xl">
        <div className="text-center">
          <h2 className="font-heading text-4xl font-black text-brand-dark">
            Safe, Secure, and Verified
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="border-l-2 border-brand-pink py-2 pl-7"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-9 w-9 text-brand-pink"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                <path d="m9 12 2 2 4-5" />
              </svg>
              <h3 className="mt-4 text-xl font-black text-brand-dark">
                {item.title}
              </h3>
              <p className="mt-2 leading-7 text-brand-dark/65">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
