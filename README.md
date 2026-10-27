[![Netlify Status](https://api.netlify.com/api/v1/badges/df086ce0-22b8-4bb9-9b0b-0ddf951b099e/deploy-status)](https://app.netlify.com/projects/orjan-wishlister/deploys)

# Wishlister

A mobile-first web app for sharing wishlists with family and friends.
Built with [SolidJS](https://solidjs.com) and [Vite+](https://viteplus.dev), backed by
[Supabase](https://supabase.com) and hosted on [Netlify](https://netlify.com).

## Develop

```bash
vp install
cp .env.example .env.local   # then fill in your Supabase URL and publishable key
vp dev                       # http://localhost:5173
vp check                     # format, lint and type check
```

## Local Supabase

To work without touching the real project, run Supabase on your machine. It needs
[Docker](https://www.docker.com/products/docker-desktop/) running; the CLI is fetched by `pnpx`.

```bash
vp run db:start              # first run downloads images; prints URLs and keys
vp run db:reset              # wipe, re-run supabase/migrations/ and supabase/seed.sql
vp run db:status             # URLs and keys again
vp run db:stop
```

Then use the local lines from `.env.example` in `.env.local` and restart `vp dev`.

- Sign in as `alice@example.com`, `bob@example.com` or `carol@example.com` (see
  `supabase/seed.sql` for who is in which group). No email is sent: the code arrives in
  Mailpit at http://127.0.0.1:54324, using the templates in `supabase/templates/`.
- Studio (tables, SQL editor, auth users) is at http://127.0.0.1:54323.
- `supabase/config.toml` only configures this local stack; production settings are still
  made in the dashboard (see _One-time setup_).
- App emails from Netlify functions go through Resend. To see them in Mailpit too, add
  `MAILPIT_URL=http://127.0.0.1:54324` to `.env.local` and restart `netlify dev`; with it set
  (and only under `netlify dev`), `RESEND_API_KEY` isn't used. Leave both out to send none.

## Storybook

```bash
vp run storybook             # http://localhost:6006
```

Storybook shows components on their own, with made-up data, so you can work on
looks without signing in or touching Supabase. It needs no `.env.local`.

- `src/components/*.stories.tsx`: one file per component, one export per state
  (bought, own list, long name…). Change the args in the Controls panel to try more.
- `src/stories/Styles.stories.tsx`: colours, type, buttons and form fields from
  `src/index.css` and the shared components on one page. Edit a token there and every story
  updates live.

To make a piece of a page available in Storybook, move it into `src/components/`
as a component that only takes props (no Supabase calls), like `ItemCard`, and
add a `.stories.tsx` file next to it. Use named exports for components
(`export function ItemCard`): the Solid docs generator breaks on anonymous
default exports.

## Styles

Every component and page keeps its styles in a CSS module next to it (`ItemCard.module.css`,
imported as `styles`). Before adding a class, check what already exists:

- `src/index.css`: theme tokens and base element styles (a plain `<button>` is the main action).
- Shared components: `Button` (`variant`, `danger`, `size`) and `LinkButton`, `Card` (`as`),
  `Popover` (`anchor`, `area`, `sheet`), `Person`, `Avatar`, `Chip`/`Chips`/`ChipButton`,
  `Check`, `Select` and `EmptyState`.
- `src/utilities.module.css` (imported as `u`): text (`muted`, `small`, `error`, `link`,
  `truncate`, `center`) and layout (`row`, `stack`, `list`, `cards`, `listRow`, `indent`),
  plus `labelText`/`labelIcon` for a label that turns into an icon on phones.

Cascade layers keep the order predictable whatever the import order: base styles lose to the
shared components, which lose to the utilities, and a component's own module beats all of them.
So a component can restyle a `Card` or `Button` it uses by passing it a class. `.page` stays a
global class: components reach for it with `:global(.page):has(...)` to change the page they are
on (the groups grid, quick add's column).

## Languages

The app speaks English and Dutch. All UI text lives in `src/i18n/`:

- `en.tsx` is the source and defines the keys. `nl.tsx` must have the same keys, or the type
  check fails.
- Components call `t("group.members")`, or `t("group.added", { email })` for text with values in
  it (see `src/lib/i18n.ts`). Text with bold parts returns JSX from its dictionary function.
- The first visit follows the browser's language. The account page has a language picker; the
  choice is saved on the device and in the account's user metadata (`locale`), so other devices and
  Supabase's emails follow it. Someone invited by email starts in the inviter's language.
- Storybook has a globe in the toolbar to switch every story's language.

To add a language, add its code to `src/i18n/locale.ts`, write a dictionary next to `nl.tsx`,
register it in `src/lib/i18n.ts`, and add a branch for it to the email templates.

## Project layout

| Path                        | What it is                                                          |
| --------------------------- | ------------------------------------------------------------------- |
| `src/lib/supabase.ts`       | The Supabase client                                                 |
| `src/lib/auth.tsx`          | `AuthProvider` and `useAuth()`: the signed-in session as a signal   |
| `src/pages/`                | One component per screen                                            |
| `src/components/`           | Presentational components and their Storybook stories               |
| `.storybook/`               | Storybook config                                                    |
| `src/index.css`             | Theme tokens (colours, spacing) and base styles                     |
| `src/utilities.module.css`  | Shared text and layout classes (see Styles)                         |
| `src/i18n/`                 | UI text in English and Dutch, and language detection                |
| `supabase/templates/`       | Sign-in and invite email bodies, to paste into Supabase             |
| `supabase/migrations/`      | Database schema and row-level security policies                     |
| `supabase/seed.sql`         | Made-up accounts, groups and items for the local Supabase           |
| `supabase/config.toml`      | Settings for the local Supabase (`vp run db:start`)                 |
| `netlify/functions/`        | `keepalive`: daily ping so the free Supabase project never pauses   |
|                             | `send-invite`: emails people invited to a group who have no account |
|                             | `send-added-email`: tells people with an account they were added    |
|                             | `page-info`: title and picture of a link pasted into quick add      |
|                             | `send-digests`: evening email to followers of lists that changed    |
|                             | `clean-pictures`: weekly, deletes uploaded pictures no item uses    |
| `netlify/lib/mail.ts`       | `sendEmail()`: app emails (not sign-in emails) through Resend       |
| `netlify/lib/digest.ts`     | Builds the daily "what changed on lists you follow" emails          |
| `netlify/lib/addedEmail.ts` | Builds the "you were added to a group" email                        |
| `netlify/lib/pageInfo.ts`   | Reads a page's `og:` tags, with Microlink as fallback               |
| `public/icon.svg`           | Source of the home-screen icons (`icon-*.png`)                      |

## Installing on a phone

The app is a PWA: `vite-plugin-pwa` (see `vite.config.ts`) adds a web app manifest and a service
worker to every build. Open the Netlify URL, then use _Share > Add to Home Screen_ (iOS Safari)
or _Install app_ (Android Chrome). The service worker only runs in `vp build`/`vp preview`, not
in `vp dev`. If you change `public/icon.svg`, re-export the `icon-*.png` files (180, 192, 384, 512 and the
maskable 192 and 512).

## One-time setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com/dashboard) (an EU region is closest).
2. **SQL Editor**: run each file in `supabase/migrations/` in order.
3. **Authentication > URL Configuration**: set _Site URL_ to your Netlify URL and add
   `http://localhost:5173` under _Redirect URLs_.
4. **Authentication > Emails > Templates**: the default emails only contain a link. Edit both
   **Magic Link** (returning users) and **Confirm signup** (someone's very first login) to include
   the one-time code as well. Paste `supabase/templates/login.html` as the body of both, with this
   subject:

   ```
   {{ if eq .Data.locale "nl" }}Je aanmeldcode voor Wishlister{{ else }}Your Wishlister sign-in code{{ end }}
   ```

   The code matters on phones: a link opens in the default browser, but an app installed on the
   home screen keeps its own login, so you type the code there instead.

   The templates are in English and Dutch. `{{ .Data.locale }}` is the language saved on the
   account (see _Languages_ below); anything other than `nl` gets English.

5. **Authentication > Emails > SMTP Settings**: Supabase's built-in sender is only meant for
   testing, so plug in a real one. With [Resend](https://resend.com) (free tier): host
   `smtp.resend.com`, port `465`, user `resend`, password = a Resend API key. Resend needs a
   domain you own to email people other than yourself.
6. **Authentication > Emails > Templates > Invite user**: this email goes to someone a manager
   invites who has no account yet. `{{ .Data.group_name }}` and `{{ .Data.invited_by }}` are
   filled in by the app, and `{{ .Data.locale }}` is the inviter's language. Paste
   `supabase/templates/invite.html` as the body, with this subject:

   ```
   {{ if eq .Data.locale "nl" }}{{ .Data.invited_by }} heeft je toegevoegd aan {{ .Data.group_name }} op Wishlister{{ else }}{{ .Data.invited_by }} added you to {{ .Data.group_name }} on Wishlister{{ end }}
   ```

7. **Project Settings > API Keys**: copy the project URL, the publishable key and a secret key.

### 2. Netlify

1. _Add new site > Import an existing project_ and pick this repository. `netlify.toml` already
   sets the build command, Node and pnpm versions.
2. _Site configuration > Environment variables_: add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`. The build and the `keepalive` function both use them.
   Also add `SUPABASE_SECRET_KEY` (a secret key, `sb_secret_…`) for `send-invite`. It has no
   `VITE_` prefix on purpose, so it never ends up in the app's JavaScript.
   For app emails (see _3. Resend_ below), also add `RESEND_API_KEY` and `MAIL_FROM`.
   Optionally add `MICROLINK_API_KEY` (see _4. Microlink_ below) and `REEFAPI_API_KEY`
   (see _5. ReefAPI_ below).
3. Deploy, then put the site URL into Supabase's _Site URL_ (step 1.3).

### 3. Resend (app emails)

Sign-in and invite emails come from Supabase. Every other email the app sends (for example
"you were added to a group" or "a list you follow changed") goes through
`netlify/lib/mail.ts`, which calls [Resend](https://resend.com)'s API. The free plan sends
3,000 emails a month, at most 100 a day.

1. Create a Resend account and, under _Domains_, add the domain to send from. Add the DNS
   records it shows (SPF, DKIM and optionally DMARC) at your DNS provider and wait until the
   domain shows _Verified_. If Supabase already sends through Resend SMTP (step 1.5), this
   domain is already there.
2. _API Keys_: create a key with _Sending access_, limited to that domain.
3. In Netlify, add `RESEND_API_KEY` (that key) and `MAIL_FROM`, the sender on the verified
   domain, e.g. `Wishlister <wishlister@example.com>`. Redeploy so functions pick them up.

The `send-digests` function mails followers of a list what changed on it, every day at 17:00
UTC. It also needs `SUPABASE_SECRET_KEY` (see `send-invite`). Until Resend is set up it sends
nothing, and changes from that time are never mailed. One digest goes to each follower per
day, so the 100-a-day limit holds as long as fewer than 100 people follow a list on the same
day.

The `send-added-email` function tells someone who already has an account that a manager added
them to a group. It also needs `SUPABASE_SECRET_KEY`. Until Resend is set up, people are still
added, just without the email.

The `clean-pictures` function deletes uploaded item pictures that no item uses anymore (the
picture or its item was removed), once a week. It needs `SUPABASE_SECRET_KEY` too. Uploads go
to the public Storage bucket `item-pictures`, which the migration creates; the app shrinks
them to about 100-200 KB first, so the free plan's 1 GB holds thousands.

### 4. Microlink (link titles in quick add)

When a link is pasted into quick add, the `page-info` function reads the page's `og:title`
and `og:image` itself. Big shops behind bot protection (lego.com, for example) refuse requests
that don't come from a real browser, so then it asks [Microlink](https://microlink.io), which
opens the page in a browser and returns its title and picture. Microlink only gets a request
when our own lookup finds no title. If it fails too, the item is named after the link.

Without a key, the free endpoint is used. To use your Microlink account's plan instead, add
`MICROLINK_API_KEY` in Netlify and redeploy. Keep an eye on the plan's monthly limit; when it
runs out, blocked shops just get the name from the link.

### 5. ReefAPI (bol.com links)

bol.com blocks both our own lookup and Microlink. So when a bol.com product link is pasted,
`page-info` asks [ReefAPI](https://reefapi.com)'s bol.com product endpoint instead, with the
product id and storefront (`/nl/nl/`, `/be/nl/`, `/be/fr/`) taken from the link. It fills in
the name, picture and price.

Add `REEFAPI_API_KEY` in Netlify and redeploy. Each product costs 2 credits (the free plan has
1000); failed calls are free. A product is remembered for a day while the function stays warm,
and the remaining credits show in the function log when ReefAPI sends them. Without the key,
or when the credits run out, bol.com links just get the name from the link.

### 6. Demo site

The demo is a separate copy of the app with made-up people, on its own Supabase project, so
visitors never see or touch real data. It's a Netlify branch deploy of the `demo` branch
(branch deploys cost no credits). With `VITE_DEMO=true` the login screen offers "Sign in as
Alice / Bob / Carol" (the people from `supabase/seed.sql`, password `wishlister-demo`) instead
of an email code, and inviting by email is hidden.

The **Demo** workflow (`.github/workflows/demo.yml`) runs every three days, and from the
_Actions_ tab by hand. It applies new migrations to the demo database, then
`supabase/demo/reset.sql` wipes it and loads the seed again. That script stops if the database
has any account outside `@example.com`, as a safety net against the real database. Pushing a
release tag (`v*`) also moves the `demo` branch to that tag, so the demo shows the latest
release.

1. **Supabase**: create a second project (the free plan allows two), e.g. `wishlister-demo`.
   Under _Authentication > Sign In / Providers_, turn off **Allow new users to sign up**. Under
   _URL Configuration_, set the _Site URL_ to the demo URL (`https://demo--<site>.netlify.app`).
   No email setup is needed.
2. **GitHub**: in the demo project, click _Connect_ and under _Connection string_ pick
   **Session pooler**. Add that string as the repository secret `DEMO_DATABASE_URL`
   (_Settings > Secrets and variables > Actions_). It looks like
   `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
   Watch out for:
   - **Not the project URL** (`https://<ref>.supabase.co`): that gives
     `failed to parse connection string`. So does a leftover `[YOUR-PASSWORD]` placeholder, the
     brackets around it, or quotes, spaces or a newline around the value.
   - **Not the direct connection** (`db.<ref>.supabase.co`): on the free plan it only has an
     IPv6 address, which GitHub's runners can't reach (`dial error (connect ECONNREFUSED …)`).
     The session pooler also works over IPv4. Its user is `postgres.<ref>`, not `postgres`.
   - **Not the transaction pooler** (port 6543): migrations need a session.
   - **Special characters in the password** (`@ # / ? : % &`) must be percent-encoded, e.g.
     `@` → `%40`. Easiest is a database password of only letters and digits
     (_Database > Settings_).
3. **Actions**: run the **Demo** workflow by hand once. It builds the database and the seed.
4. **Netlify**, _Site configuration > Environment variables_: give `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` a branch value for `demo` (the demo project's), and add
   `VITE_DEMO` = `true` for the `demo` branch only.
5. **Netlify**, _Build & deploy > Branches and deploy contexts_: under _Branch deploys_, add the
   branch `demo`. It appears after the first release tag, or push it once by hand.

## Closing registrations

To stop new people from signing up, turn off **Allow new users to sign up** in Supabase
(_Authentication > Sign In / Providers_). It works at once, with no redeploy. Anyone with an
account can still sign in; someone new who tries gets "New registrations are closed right now",
and invite links can't create accounts either. Group managers can still invite people by email,
because those invites create the account on the server.
