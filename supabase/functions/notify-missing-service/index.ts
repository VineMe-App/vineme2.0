import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

interface MissingServicePayload {
  church_id?: string;
  church_name: string;
  church_location?: string;
  service_name?: string;
  service_time?: string;
  additional_info?: string;
  contact_name: string;
  contact_email: string;
  requester_name?: string;
  requester_id?: string;
  requester_email?: string;
}

const TO_EMAIL =
  Deno.env.get('MISSING_SERVICE_TO_EMAIL') || 'hh.jacob@gmail.com';
const FROM_EMAIL =
  Deno.env.get('MISSING_SERVICE_FROM_EMAIL') || 'connect@vineme.app';
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';

function buildEmailBody(payload: MissingServicePayload) {
  const summary = [
    `Church: ${payload.church_name}`,
    payload.church_location ? `Location: ${payload.church_location}` : null,
    payload.service_name ? `Service: ${payload.service_name}` : null,
    payload.service_time ? `Typical time: ${payload.service_time}` : null,
    `Contact: ${payload.contact_name} (${payload.contact_email})`,
    payload.additional_info ? `Notes: ${payload.additional_info}` : null,
    payload.requester_name
      ? `Submitted by: ${payload.requester_name}`
      : payload.requester_email
        ? `Submitted by: ${payload.requester_email}`
        : null,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `
    <h2>New church/service request</h2>
    <p>A user submitted details for a church or service that is not yet listed.</p>
    <ul>
      <li><strong>Church:</strong> ${payload.church_name}</li>
      ${payload.church_location ? `<li><strong>Location:</strong> ${payload.church_location}</li>` : ''}
      ${payload.service_name ? `<li><strong>Service:</strong> ${payload.service_name}</li>` : ''}
      ${payload.service_time ? `<li><strong>Typical time:</strong> ${payload.service_time}</li>` : ''}
      <li><strong>Contact:</strong> ${payload.contact_name} (${payload.contact_email})</li>
      ${payload.additional_info ? `<li><strong>Notes:</strong> ${payload.additional_info}</li>` : ''}
      ${payload.requester_name ? `<li><strong>Requester:</strong> ${payload.requester_name}</li>` : ''}
      ${payload.requester_email ? `<li><strong>Requester email:</strong> ${payload.requester_email}</li>` : ''}
      ${payload.requester_id ? `<li><strong>Requester user id:</strong> ${payload.requester_id}</li>` : ''}
      ${payload.church_id ? `<li><strong>Existing church id:</strong> ${payload.church_id}</li>` : ''}
    </ul>
  `;

  return { text: summary, html };
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const payload = (await req.json()) as Partial<MissingServicePayload>;
    if (
      !payload.church_name ||
      !payload.contact_name ||
      !payload.contact_email
    ) {
      return new Response('Missing required fields', { status: 400 });
    }

    if (!SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY not configured');
      return new Response('Email service unavailable', { status: 500 });
    }

    const { text, html } = buildEmailBody(payload as MissingServicePayload);

    const response = await fetch(SENDGRID_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: TO_EMAIL }],
          },
        ],
        from: { email: FROM_EMAIL, name: 'VineMe Alerts' },
        subject: 'VineMe – New church/service request',
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid email error:', {
        status: response.status,
        body: errorText,
      });
      return new Response(
        JSON.stringify({
          success: false,
          status: response.status,
          error: 'Failed to send email',
          details: errorText,
        }),
        { status: 502 }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('notify-missing-service error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
