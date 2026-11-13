export default function Testimonials() {
  return (
    <section className="bg-white px-5 pb-14 pt-8 sm:px-6 lg:pb-8 lg:pt-16">
      <figure className="relative mx-auto max-w-6xl px-4 py-8 text-center">
        <span
          aria-hidden="true"
          className="absolute left-0 -top-2 font-heading text-8xl font-black leading-none text-brand-pink sm:text-9xl md:-top-6"
        >
          &ldquo;
        </span>
        <blockquote className="relative text-2xl font-medium leading-snug text-brand-pink sm:text-3xl lg:text-4xl">
          I&apos;m back from several years volunteering in refugee camps and
          anti-trafficking safe houses. I&apos;m feeling quite lost in London
          and looking to build community. Thank you for creating this app to
          help everyone connect. God bless you 😊🙏
        </blockquote>
        <figcaption className="mt-10 text-sm font-medium text-brand-dark/60 sm:mt-12 sm:text-base">
          — A returning Londoner
        </figcaption>
      </figure>
    </section>
  );
}
