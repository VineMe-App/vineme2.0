# Dashboard design guide

Scope: the church admin dashboard (`app/dashboard/**`) only. Marketing pages
(`/`, `/church`, `/find`, `/legal/*`) and `/login` keep their own Nunito and
brand styling and must not use anything described here.

## How the scope works

- `app/dashboard/layout.tsx` wraps every dashboard route in `.admin-theme`
  and loads Cal Sans. Nothing is applied globally.
- `AdminThemeScope` mirrors the theme classes onto `<body>` while on
  `/dashboard`, so portaled coss UI (Sheet, Select, Menu, ...) is themed too.
- `AdminGate` (client) does the Supabase church-admin check once for the
  whole area and renders `DashboardNav` plus the page. Pages do not repeat it.
- The marketing `Navbar` returns `null` on `/dashboard*`; the dashboard has
  its own nav.
- `.admin-theme` lives in `app/globals.css`. It defines the coss ui colour
  tokens and overrides `--font-heading` and the base `font-family`.
- New dashboard routes go under `app/dashboard/` so they inherit the layout,
  the access check and the nav. Add the tab to `navItems` in
  `components/dashboard/DashboardNav.tsx`.

## Pages

| Route | Purpose |
|---|---|
| `/dashboard` | Overview (home): header, stats, user preview |
| `/dashboard/follow-ups` | People waiting on a follow-up, split into "Needs attention", "On track" and "Attended, not yet added". Each section is a `CardFrame` + `Table`. Each row ends with a "Review" button (chevron) and the whole row is clickable; both open a Sheet editor |
| `/dashboard/groups` | Compact group cards. Map is the default: two columns of cards beside a MapLibre map (OpenFreeMap tiles) that fills the screen under the nav and stays put while the cards scroll. Cards shows the grid only. On a small screen the map sits above the cards. A pin opens the same `GroupSheet`. Pins use `location.coordinates` |
| `/dashboard/members` | Searchable members table. Rows (and the Overview "User database" rows) open a `MemberSheet` with badges, phone (looked up on open) with Call and WhatsApp, bio, group memberships, and links to the follow-ups and groups pages |
| `/dashboard/reports` | Short underline tabs (Downloads, Pipeline, Groups, Team, Newcomers, Connection). The full question stays as the heading inside the panel. Charts are Recharts, church-scoped, and only where the table has the data. "Downloaded" is a signup with no live group, not a store download event |
| `/dashboard/settings` | Integrations, starting with the ChurchSuite link form |

Live data comes from `lib/dashboard/queries.ts` (one fetch function per page, run through `useDashboardQuery`); shared components in
`components/dashboard/`.

## Navigation

- Sticky top bar: logo, tabs (icon + label for Overview (Home), Follow-ups, Groups, Members, Reports, Settings),
  avatar on the right. Active tab has a `border-b-2` underline and
  `aria-current="page"`. Tabs scroll horizontally on small screens.
- Page background is `bg-muted` (light grey) so white coss cards stand out.

## Sheet editor pattern

- Use coss `Sheet` (`side="right"`) for editing a record from a list, not a
  fixed side panel. Header = avatar, name, context; `SheetPanel` = scrolling
  form; `SheetFooter` = primary action and destructive action.
- Keep the selected id in state after closing so the exit animation does not
  flash empty content. Key the editor by record id to reset local state.

## Component library: coss ui

- Docs: <https://coss.com/ui/docs>. LLM-friendly index: <https://coss.com/ui/llms.txt>.
- Built on Base UI (`@base-ui/react`) and Tailwind v4. Not an npm package;
  components are copied into `components/ui/` and owned by us.
- Add a component with the shadcn CLI (registry `@coss` is set in
  `components.json`):

  ```bash
  npx shadcn@latest add @coss/dialog
  ```

  Review the diff afterwards. The CLI can append theme variables to
  `app/globals.css` (`:root` and a `.dark` block). Revert those and add any
  new tokens under `.admin-theme` so the marketing pages stay untouched.
- Installed today: `button`, `input`, `field`, `label`, `form`, `spinner`,
  `card`, `table`, `badge`, `avatar`, `sheet`, `checkbox`, `select`,
  `textarea`, `scroll-area`, `progress`.
- Use `Field` + `FieldLabel` + `Input` for form controls. Do not pass `id` /
  `htmlFor`; Base UI links the label and control automatically.
- `Button` renders `type="button"` by default. Set `type="submit"` explicitly
  on submit buttons.
- Panels: `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardPanel`,
  `CardFooter`). Tables and lists: `CardFrame` + `CardFrameHeader` wrapping
  `Table variant="card"`.
- Badges: always coss `Badge`, `size="lg"` in tables. Status uses `success`
  (connected), `warning` (pending), `info` (waiting); roles use `secondary`.
  Always keep the text label.
- People: `Avatar` + `AvatarFallback` with initials.
- Prefer `Button` `loading` over hand-rolled spinners when a button is
  waiting on a request.

## Colour

Brand colours are the source of truth and are unchanged from the marketing
site. coss tokens are mapped onto them inside `.admin-theme`.

| Token | Value | Use |
|---|---|---|
| `--brand-pink` | `#ff0083` | Primary actions, focus ring, key accents |
| `--brand-dark` | `#2c2235` | Body text, dark surfaces (header card) |
| `--brand-beige` | `#fffbee` | Page and card backgrounds, table header |
| `--primary` | `var(--brand-pink)` | coss `Button` default, `bg-primary` |
| `--ring` | `var(--brand-pink)` | Focus ring on coss inputs and buttons |
| `--input` | brand-dark at 15% | Input borders |
| `--muted-foreground` | brand-dark at 65% | Helper text, descriptions |
| `--destructive` (+ `-foreground`) | red 500 / 700 | Errors, destructive actions |
| `--success`, `--warning`, `--info` | emerald / amber / blue | Status badges, alerts |

Rules:

- Use brand utilities (`bg-brand-pink`, `text-brand-dark`, `bg-brand-beige`)
  for layout surfaces and text. Use coss semantic tokens (`bg-primary`,
  `text-muted-foreground`, `border-input`) inside coss components.
- Do not hard-code hex values. Do not edit the `--brand-*` variables for the
  dashboard; change the mapping in `.admin-theme` instead.
- `.admin-theme *` sets the default border colour to `--border` (coss expects
  this; Tailwind's default is `currentColor`). Keep it in `@layer base`.
- Dark mode is not supported. The `dark:` variants in coss files are inert.
- Charts use the brand palette only: `--brand-pink` for the main series (never green), `--brand-dark` for the comparison series, and `--chart-stage-1` to `--chart-stage-4` for ordered stages (darkest pink = most urgent). Status badges still use emerald, amber and blue.

## Typography

- **Font:** Cal Sans v2 variable (weights 400-700), SIL OFL 1.1. Files and
  licence are in `app/fonts/cal-sans/`. Loaded via `next/font/local` in
  `app/dashboard/layout.tsx` as `--font-cal-sans`.
- **Body and UI text:** Cal Sans, with Nunito as the fallback, set on
  `.admin-theme`.
- **Headings:** use the existing `font-heading` class. Inside the dashboard
  it resolves to Cal Sans; on marketing pages it still resolves to Nunito
  Black.
- **Weights:** Cal Sans stops at 700. `font-black` (900) renders as 700, so
  prefer `font-bold` in new dashboard code.
- **Sizes:** coss components size themselves (`text-base` on touch,
  `sm:text-sm` on desktop). For page headings use `text-3xl`-`text-5xl`;
  section headings `text-2xl`-`text-3xl`; small uppercase labels use
  `text-sm uppercase tracking-[0.18em]`.
- Never import another font in the dashboard. Add weights or families in
  `layout.tsx` only if the design genuinely needs them.

## Labels

- Every status, stage, follow-up state and measure label comes from
  `lib/dashboard/terms.ts`, which matches `docs/dashboard/glossary.md`. Never
  type one into a component: import it, so a term is renamed in one place.

## Layout and shape

- Page container: wrap every page in `DashboardPage`
  (`components/dashboard/DashboardPage.tsx`), never a hand-written section. It
  sets the spacing (`px-5 py-6 sm:px-6 lg:py-8`) and width (`max-w-6xl`, or
  `wide` for `max-w-[90rem]`), so every page shares one top edge.
  Narrow pages (Settings, Profile) are centred: a `mx-auto max-w-*` wrapper
  inside it.
- Cards: use coss `Card` / `CardFrame` (rounded-2xl, subtle border and
  shadow). The brand-dark hero card at the top of the overview is the one
  custom surface (`rounded-3xl bg-brand-dark`).
- Controls follow coss defaults (`rounded-lg`, 32-40px height). Use
  `size="xl"` for primary page-level buttons and `className="w-full"` for
  full-width form actions.
- Grids: `gap-5` for stat tiles, `gap-8` between major panels; stack on
  mobile, two columns from `lg`.
- Tables: coss `Table variant="card"` inside `CardFrame`. Set a `min-w` on
  wide tables; the frame scrolls horizontally on small screens.

### Nested radii (concentric corners)

Outer radius = inner radius + padding. When an image or panel sits inside a
rounded card, never reuse the card's radius on it. Inset it by a fixed padding
and subtract that padding (plus the 1px border) from the card radius.

- Card is `rounded-2xl` (16px), image inset is `p-2` (8px), so the image
  radius is 16 - 8 - 1 = 7px.
- `GroupImage` applies it as `rounded-[calc(var(--outer-radius,var(--radius-2xl))-var(--inset,0.5rem)-1px)]`, so it reads `--outer-radius` (default `--radius-2xl`) and `--inset` (default `0.5rem`). Override them with `[--inset:...]` / `[--outer-radius:...]` if the parent differs.
- If the inset is as large as the card radius (for example `p-6` on a 16px
  card), the inner corner is square or free to choose; do not copy the outer
  radius.
- The group sheet still insets its photo this way. On the group cards the photo meets the card edges, with only the top corners rounded to the card. The follow-up badge sits on that photo, top left.

## Content tone

- Plain, warm, pastoral. Short sentences. No jargon ("Link to ChurchSuite",
  not "Configure integration").
- Sentence case for buttons and headings.
- Empty and error states say what happened and what to do next.

## Accessibility

- Every input has a visible `FieldLabel`.
- Keep the coss focus ring (`--ring`); do not remove outlines.
- Status is never colour-only; pair badge colour with text.
- Interactive targets stay at least 44px on touch (coss handles this for its
  buttons via `pointer-coarse`).

## Do and don't

- Do add new admin UI by composing `components/ui/*`.
- Do keep new coss components in `components/ui/` and run lint and build.
- Don't import `components/ui/*` into marketing pages or `/login`.
- Don't add `:root` colour or font overrides for dashboard needs.
- Don't add a second heading font.

## Open items

- The church icon beside the avatar (`components/dashboard/ChurchSwitcher.tsx`)
  opens the church switcher; the avatar links to `/dashboard/profile`. A church
  admin belongs to one church (`users.church_id`), so the switcher lists one
  church; it lists every church only for a `superadmin`, and RLS does not yet
  return other churches' data to them. Linking admins to several churches needs
  a join table and policies.
- The profile page mirrors the mobile app's profile screen: initials avatar,
  name, editable bio (writes `users.bio` for your own row), church, service,
  member since, a link to Settings, and Sign out. Left out on purpose: Friends
  and "Open admin dashboard" (mobile-only), avatar upload, and Delete Account
  (destructive; needs its own confirmation flow).
- Installing a coss component with the CLI appends theme variables to
  `app/globals.css` (it added `--destructive-foreground` and a `.dark` block for
  `menu`). Revert those; the dashboard theme already defines the tokens.
- Overview, follow-ups, groups and members read live Supabase data. Changes in
  the follow-up Sheet editor (steps, notes, add to group, archive) are local
  state only and are not saved. Saving needs server-side functions that check
  the church (see `docs/supabase/security-findings.md` on the auth-journey
  branch).
- Follow-up steps map to `group_memberships.journey_status`: 1 reached out,
  2 spoken to, 3 attended group. Step dates come from
  `journey_status_change` notes; the overdue window is
  `FOLLOW_UP_SLA` in `lib/dashboard/queries.ts`: reach out within 6 days of the
  request; follow up a reach out within 10 days; follow up a "spoken to" within
  14 days; attend a group within 30 days of the request (the final deadline
  whatever the stage). Stage dates come from `journey_status_change` notes; if a
  stage was never logged the count falls back to the request date.
- Groups have an `at_capacity` flag but no capacity number, so the groups page
  shows member counts, not "n of N places". Group details such as pet friendly
  or accessible aren't stored, so cards don't show them (DEV-8).
- Email addresses, referral notes and "From your email" are not available to the
  app (the `referrals` table has no read policy), so they are not shown.
- The ChurchSuite form does not submit.
