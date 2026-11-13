import fs from "fs";
import path from "path";
import type { MailDataRequired } from "@sendgrid/helpers/classes/mail";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL;
const NOTIFY_EMAILS = (process.env.CONTACT_NOTIFY_EMAILS || "")
  .split(",")
  .map((email) => email.trim())
  .filter(Boolean);
const logoPath = path.join(
  process.cwd(),
  "public",
  "images",
  "vineme-logo-email.png"
);

let logoBase64: string | null = null;
try {
  const buffer = fs.readFileSync(logoPath);
  if (buffer.length === 0) {
    console.error("Logo PNG is empty at:", logoPath);
  } else {
    logoBase64 = buffer.toString("base64");
    console.log(
      "Logo loaded for email attachment, size:",
      buffer.length,
      "bytes"
    );
  }
} catch (error) {
  console.error("Failed to read logo PNG for email attachment:", error);
}

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function logSendGridError(label: string, error: unknown) {
  console.error(label, error);

  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "body" in error.response
  ) {
    console.error(
      "SendGrid response body:",
      JSON.stringify(error.response.body, null, 2)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (
      !sendgridApiKey ||
      !supabaseUrl ||
      !supabaseServiceRoleKey ||
      !FROM_EMAIL
    ) {
      console.error("Contact form environment variables are missing.");
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }

    sgMail.setApiKey(sendgridApiKey);

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await request.json();
    const {
      contact_name,
      requester_role,
      church_name,
      church_location,
      contact_email,
      additional_info,
      website,
    } = body;

    if (website && website.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    if (
      !contact_name?.trim() ||
      !requester_role?.trim() ||
      !church_name?.trim() ||
      !church_location?.trim() ||
      !contact_email?.trim() ||
      !additional_info?.trim()
    ) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    if (!isValidEmail(contact_email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (additional_info.length > 5000) {
      return NextResponse.json(
        {
          error: "Message is too long. Please keep it under 5000 characters.",
        },
        { status: 400 }
      );
    }

    const trimmedContactName = contact_name.trim();
    const trimmedRole = requester_role.trim();
    const trimmedChurchName = church_name.trim();
    const trimmedChurchLocation = church_location.trim();
    const trimmedContactEmail = contact_email.trim().toLowerCase();
    const trimmedAdditionalInfo = additional_info.trim();

    const { error: supabaseError } = await supabase
      .from("new_church_requests")
      .insert({
        requester_name: trimmedContactName,
        requester_role: trimmedRole,
        church_name: trimmedChurchName,
        church_location: trimmedChurchLocation,
        requester_email: trimmedContactEmail,
        contact_name: null,
        contact_email: null,
        additional_info: trimmedAdditionalInfo,
        source: "website",
      });

    if (supabaseError) {
      console.error("Supabase insert error:", supabaseError);
      return NextResponse.json(
        { error: "Something went wrong saving your message. Please try again." },
        { status: 500 }
      );
    }

    const firstName = trimmedContactName.split(/\s+/)[0];
    const notificationHtml = `
      <h2>New website enquiry — VineMe</h2>
      <p><strong>Name:</strong> ${escapeHtml(trimmedContactName)}</p>
      <p><strong>Role:</strong> ${escapeHtml(trimmedRole)}</p>
      <p><strong>Church:</strong> ${escapeHtml(trimmedChurchName)}</p>
      <p><strong>Location:</strong> ${escapeHtml(trimmedChurchLocation)}</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(trimmedContactEmail)}">${escapeHtml(trimmedContactEmail)}</a></p>
      <p><strong>Message:</strong></p>
      <p style="white-space: pre-wrap;">${escapeHtml(trimmedAdditionalInfo)}</p>
    `;

    if (NOTIFY_EMAILS.length > 0) {
      try {
        await sgMail.send({
          to: NOTIFY_EMAILS,
          from: {
            email: FROM_EMAIL,
            name: "VineMe Enquiry",
          },
          replyTo: trimmedContactEmail,
          subject: `New VineMe enquiry from ${trimmedChurchName}`,
          html: notificationHtml,
        });
      } catch (emailError: unknown) {
        logSendGridError("SendGrid notification email failed:", emailError);
      }
    }

    const autoReplyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #2C2235; line-height: 1.6;">
        <p>Hi ${escapeHtml(firstName)},</p>
        <p>Thank you for getting in touch about VineMe. I'm excited to hear more about ${escapeHtml(trimmedChurchName)} and to see if VineMe could be a good fit for it.</p>
        <p>VineMe started from a simple conviction. That nobody should sit alone in a church without finding their inner circle. I'm so grateful you're thinking about this for your own community.</p>
        <p>I'll be in touch as soon as I can, usually within a few days.</p>
        <p>God bless,</p>
        <p style="margin: 0;">Olly, VineMe Founder<br/>
        <a href="mailto:connect@vineme.app" style="color: #FF0083;">connect@vineme.app</a><br/>
        <a href="https://getvineme.app" style="color: #FF0083;">https://getvineme.app</a></p>
        <div style="margin-top: 10;">
          <img src="cid:vineme-logo" alt="VineMe" style="height: 60px; width: auto;" />
        </div>
      </div>
    `;

    const autoReplyMessage = {
      to: trimmedContactEmail,
      from: {
        email: FROM_EMAIL,
        name: "Olly @ VineMe",
      },
      subject: "Thanks for getting in touch about VineMe",
      html: autoReplyHtml,
      attachments: logoBase64 && logoBase64.length > 0
        ? ([
            {
              content: logoBase64,
              filename: "vineme-logo.png",
              type: "image/png",
              disposition: "inline",
              content_id: "vineme-logo",
            },
          ] as unknown as MailDataRequired["attachments"])
        : [],
    };

    try {
      await sgMail.send(autoReplyMessage);
    } catch (emailError: unknown) {
      logSendGridError("SendGrid auto-reply email failed:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
