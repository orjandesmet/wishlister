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

## Project layout

| Path                   | What it is                                                        |
| ---------------------- | ----------------------------------------------------------------- |
| `src/lib/supabase.ts`  | The Supabase client                                               |
| `src/lib/auth.tsx`     | `AuthProvider` and `useAuth()`: the signed-in session as a signal |
| `src/pages/`           | One component per screen                                          |
| `src/index.css`        | Theme tokens (colours, spacing) and base styles                   |
| `supabase/migrations/` | Database schema and row-level security policies                   |
| `netlify/functions/`   | `keepalive`: daily ping so the free Supabase project never pauses |

## One-time setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com/dashboard) (an EU region is closest).
2. **SQL Editor**: run each file in `supabase/migrations/` in order.
3. **Authentication > URL Configuration**: set _Site URL_ to your Netlify URL and add
   `http://localhost:5173` under _Redirect URLs_.
4. **Authentication > Emails > Templates > Magic Link**: make the email include the one-time
   code as well as the link, for example:

   ```html
   <h2>Sign in to Wishlister</h2>
   <p>Your code is <strong>{{ .Token }}</strong></p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a>.</p>
   ```

   The code matters on phones: a link opens in the default browser, but an app installed on the
   home screen keeps its own login, so you type the code there instead.

5. **Authentication > Emails > SMTP Settings**: Supabase's built-in sender is only meant for
   testing, so plug in a real one. With [Resend](https://resend.com) (free tier): host
   `smtp.resend.com`, port `465`, user `resend`, password = a Resend API key. Resend needs a
   domain you own to email people other than yourself.
6. **Project Settings > API Keys**: copy the project URL and the publishable key.

### 2. Netlify

1. _Add new site > Import an existing project_ and pick this repository. `netlify.toml` already
   sets the build command, Node and pnpm versions.
2. _Site configuration > Environment variables_: add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY`. The build and the `keepalive` function both use them.
3. Deploy, then put the site URL into Supabase's _Site URL_ (step 1.3).
