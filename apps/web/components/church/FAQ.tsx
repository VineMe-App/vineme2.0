"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Is VineMe easy to use?",
    answer:
      "If your leaders can send a text, they can use VineMe. Best of all, newcomers don't have to download anything. As long as a friend or a volunteer has the app, they can get a newcomer plugged into a group in seconds.",
  },
  {
    question: "How much does it cost?",
    answer:
      "We are in a pilot phase with a flat rate of £20/month. This covers our hosting and development while we build the platform alongside you. Churches that join now will benefit from early-adopter pricing as the product scales.",
  },
  {
    question: "Which churches is VineMe built for?",
    answer:
      "VineMe is designed for churches of 150+ where connecting people is starting to feel a bit more complex. It’s especially powerful for multi-service or multi-site churches where \"connection leakage\" happens easily.",
  },
  {
    question: "How does this differ from ChurchSuite?",
    answer:
      'ChurchSuite is a brilliant database for the people already in your church. In contrast, VineMe is the "front porch" - a congregation facing tool to help people actually connect in. They do different jobs, and we are currently building an integration so they can talk to each other.',
  },
  {
    question: "How do you handle data and safeguarding?",
    answer:
      "Safeguarding is our highest priority. Contact details are only shared with a leader after someone asks to join their group. Every group is verified by your pastoral team, and we are fully GDPR compliant and ICO registered.",
  },
  {
    question: "Is it ready to use?",
    answer:
      "Yes. VineMe has been running at HTB Onslow Square for over 18 months. It’s a mature product with real connections happening every week. Since we're still growing, our early-adopter churches get a direct say in the features we build next.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="px-5 pb-10 pt-8 sm:px-6 lg:pb-12 lg:pt-16">
      <div className="mx-auto w-full max-w-4xl">
        <div className="text-center">
          <h2 className="font-heading text-4xl font-black text-brand-dark sm:text-5xl">
            Frequently Asked Questions
          </h2>
          <div className="mx-auto mt-6 h-1 w-20 bg-brand-pink" />
        </div>
        <div className="mt-12 grid gap-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.question}
                className="rounded-lg border border-brand-dark/10 bg-white shadow-sm"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-lg font-black text-brand-dark sm:px-7"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span>{faq.question}</span>
                  <span className="text-brand-pink">{isOpen ? "-" : "+"}</span>
                </button>
                {isOpen ? (
                  <p className="px-5 pb-6 leading-7 text-brand-dark/70 sm:px-7">
                    {faq.answer}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
