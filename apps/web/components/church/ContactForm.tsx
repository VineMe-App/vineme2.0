"use client";

import { useState } from "react";

const initialFormState = {
  contact_name: "",
  requester_role: "",
  church_name: "",
  church_location: "",
  contact_email: "",
  additional_info: "",
  website: "",
};

type FormState = typeof initialFormState;
type SubmissionStatus = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setStatus("success");
      setForm(initialFormState);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    }
  };

  if (status === "success") {
    return (
      <section
        id="contact"
        className="scroll-mt-16 px-5 pb-8 pt-8 sm:px-6 lg:scroll-mt-12 lg:pb-14 lg:pt-16"
      >
        <div className="mx-auto w-full max-w-2xl text-center">
          <h2 className="font-heading text-4xl font-black text-brand-dark sm:text-5xl">
            Thank you so much!
          </h2>
          <p className="mt-5 text-lg text-brand-dark/65">
            We&apos;ve received your message and we&apos;ll be in touch over the
            next few days to chat about your church.
          </p>
          <p className="mt-3 text-base text-brand-dark/55">
            Please check your inbox for an email confirmation from
            connect@vineme.app.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="contact"
      className="scroll-mt-16 px-5 pb-2 pt-8 sm:px-6 lg:scroll-mt-12 lg:pb-4 lg:pt-16"
    >
      <div className="mx-auto w-full max-w-4xl text-center">
        <h2 className="font-heading text-4xl font-black text-brand-dark sm:text-5xl">
          Is VineMe right for your church?
        </h2>
        <p className="mt-5 text-lg text-brand-dark/65">
          Let&apos;s have a conversation about how we can help your community
          thrive.
        </p>
        <form
          onSubmit={handleSubmit}
          className="relative mt-10 rounded-lg bg-brand-dark/5 p-6 text-left sm:p-10"
        >
          <div className="grid gap-8 md:grid-cols-2">
            <FormField
              label="Your Name"
              name="contact_name"
              value={form.contact_name}
              onChange={handleChange}
              placeholder="Full Name"
              required
            />
            <FormField
              label="Your Role"
              name="requester_role"
              value={form.requester_role}
              onChange={handleChange}
              placeholder="e.g. Lead Pastor, Ministry Assistant"
              required
            />
            <FormField
              label="Church Name"
              name="church_name"
              value={form.church_name}
              onChange={handleChange}
              placeholder="e.g. Grace Community"
              required
            />
            <FormField
              label="Town or City"
              name="church_location"
              value={form.church_location}
              onChange={handleChange}
              placeholder="e.g. London"
              required
            />
          </div>
          <div className="mt-8">
            <FormField
              label="Email Address"
              name="contact_email"
              type="email"
              value={form.contact_email}
              onChange={handleChange}
              placeholder="you@email.co.uk"
              required
            />
          </div>
          <label className="mt-8 block">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-brand-dark/55">
              Your Message
            </span>
            <textarea
              name="additional_info"
              rows={5}
              value={form.additional_info}
              onChange={handleChange}
              placeholder="Tell us about your community..."
              required
              maxLength={5000}
              className="mt-3 w-full resize-none border-0 border-b border-brand-dark/10 bg-transparent px-0 py-3 text-lg outline-none placeholder:text-brand-dark/25 focus:border-brand-pink"
            />
          </label>

          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-9999px",
              width: "1px",
              height: "1px",
              overflow: "hidden",
            }}
          >
            <label>
              Website
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={handleChange}
              />
            </label>
          </div>

          {status === "error" ? (
            <p className="mt-6 text-sm text-red-600">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="mt-8 w-full rounded-md bg-brand-pink px-6 py-4 text-lg font-black text-white shadow-lg shadow-brand-pink/25 transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? "Sending..." : "Let\u2019s Talk"}
          </button>
        </form>
      </div>
    </section>
  );
}

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.18em] text-brand-dark/55">
        {label}
      </span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="mt-3 w-full border-0 border-b border-brand-dark/10 bg-transparent px-0 py-3 text-lg outline-none placeholder:text-brand-dark/25 focus:border-brand-pink"
      />
    </label>
  );
}
