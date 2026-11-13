import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white px-5 py-10 sm:px-6 lg:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="border-t border-neutral-200 pb-8 pt-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div>
              <Image
                src="/images/vineme-assets/LOGO/vineme_svg-05.svg"
                alt="VineMe"
                width={111}
                height={30}
                className="h-6 w-auto"
              />
              <p className="mt-2 text-xs text-neutral-500">
                &copy; {new Date().getFullYear()}{" "}
                <a
                  href="https://find-and-update.company-information.service.gov.uk/company/15753981"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-neutral-700 hover:underline"
                >
                  VineMe International Limited
                </a>
                .
              </p>
            </div>

            <div className="mt-3 hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 md:mt-0 md:flex">
              <Link
                href="/legal/end-user-terms"
                className="transition-colors hover:text-neutral-700"
              >
                End User Terms
              </Link>
              <span aria-hidden="true">·</span>
              <Link
                href="/legal/church-terms"
                className="transition-colors hover:text-neutral-700"
              >
                Church Terms
              </Link>
              <span aria-hidden="true">·</span>
              <Link
                href="/legal/privacy-policy"
                className="transition-colors hover:text-neutral-700"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          <p className="mt-3 text-xs leading-6 text-neutral-500">
            Built with the time, talent, effort and prayer of Oliver Youle · Jacob Hughes-Hallett · Christina Ajose · Tof Onaeko
            · Tom Oakley · Julie Ip · Oj Tayo · Freddy Law · Aimee Kyffin
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 md:hidden">
            <Link
              href="/legal/end-user-terms"
              className="transition-colors hover:text-neutral-700"
            >
              End User Terms
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/legal/church-terms"
              className="transition-colors hover:text-neutral-700"
            >
              Church Terms
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              href="/legal/privacy-policy"
              className="transition-colors hover:text-neutral-700"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
