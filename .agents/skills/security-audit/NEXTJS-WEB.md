# Next.js web and Clergy Dashboard (`apps/web`)

Read `apps/web/AGENTS.md` first: this Next.js version differs from older ones, so check `node_modules/next/dist/docs/` for how route handlers, server actions, caching and the request proxy/middleware work in it.

## Server entry points
- [ ] List route handlers (`app/**/route.ts`) and server actions (`'use server'`). Each is a public endpoint: anyone can call it with any input, whatever the UI does.
- [ ] Each one checks the user server-side (Supabase `auth.getUser()` or claims verification, not an unverified `getSession()` read of cookies) and checks role and church before acting.
- [ ] Auth checks live in the handler, action or data function, not only in a layout, page or client component. Layouts don't re-run on every navigation, and client checks can be skipped.
- [ ] Any request proxy/middleware used for auth only refreshes the session and redirects; it isn't the only thing protecting data.
- [ ] Ids from the URL, form or body are checked against the caller's church.
- [ ] Server code that uses a service-role client is never imported by client components.

## Data exposure
- [ ] Server components don't pass whole rows to client components when the client only needs a few fields; everything passed to the client is visible in the page payload.
- [ ] Per-user or per-church data isn't cached in a way shared across users (static rendering, `fetch` cache, `unstable_cache`/`use cache` without a user key, CDN caching of authenticated responses).
- [ ] Public pages (group finder, church pages, embeds) only show public fields (see `church-data-protection`).

## Browser
- [ ] No `dangerouslySetInnerHTML` or markdown/HTML rendering of user content without sanitising.
- [ ] Redirect targets after login/reset (`next`, `redirect_to`, `returnUrl`) only allow same-site paths.
- [ ] Security headers in `next.config.ts` or the host: CSP (at least `frame-ancestors`), `X-Content-Type-Options`, `Referrer-Policy`. Missing headers are hardening notes unless they enable a concrete attack.

## Public forms and APIs
- [ ] Contact and sign-up forms validate input, limit size, and have abuse protection (rate limit, captcha or similar). Mails sent from form input can't be pointed at arbitrary recipients or carry injected headers.

Check locally with `npm run dev` and seed users, calling route handlers and actions directly (e.g. with `curl` against localhost) as different roles and as no one.
