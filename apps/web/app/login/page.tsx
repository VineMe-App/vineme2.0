import Image from "next/image";
import AdminLoginForm from "@/components/auth/AdminLoginForm";

export default function LoginPage() {
  return (
    <section className="bg-brand-beige px-5 py-16 sm:px-6 lg:py-24">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-brand-pink">
            VineMe sign in
          </p>
          <h1 className="mt-4 font-heading text-5xl font-black leading-[1.05] text-brand-dark sm:text-6xl">
            Welcome back to your church connection hub.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-brand-dark/75">
            Sign in with a one-time code sent by email or SMS. Access is
            restricted to users marked as church admins in VineMe.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-2xl shadow-brand-dark/10 sm:p-8">
          <Image
            src="/images/vineme-assets/LOGO/vineme_svg-05.svg"
            alt="VineMe"
            width={180}
            height={49}
            className="mb-8 h-8 w-auto"
            priority
          />

          <AdminLoginForm />

          <p className="mt-5 text-sm leading-6 text-brand-dark/60">
            Only pastoral staff can use login.
          </p>
        </div>
      </div>
    </section>
  );
}
