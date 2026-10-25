# Panel Worker

Backend for the editing panel at `/panel`, for admins who don't have a GitHub
account. They sign in with a user name and password; this Worker keeps the
GitHub token and makes the commits for them. Each commit says which admin made
it.

There are two kinds of account:

- **Owners** are set once from the terminal (the `ADMINS` secret). Only they
  see the **Admins** page in the panel.
- **Admins** join by invitation. An owner types their user name in the Admins
  page and gets a link; the admin opens it and chooses their own password. The
  link works once and expires in 7 days. A forgotten password is fixed the same
  way: the owner makes a "new password link". These accounts live in the
  Worker's KV store (`PANEL`).

Nobody ever sees anyone else's password: only a hash is stored. Anyone can
change their own from the **Account** page (click your name in the top bar).

The forms come from `public/admin/config.yml`, the same file Sveltia uses, so
both panels always show the same fields.

It can only touch `src/content/` and `public/`, and only JSON and image files.
Even someone holding a stolen session couldn't change code or workflows.

## Try it locally (no setup)

```bash
npm run dev
```

Open http://localhost:5173/panel and sign in with any name and the password
`dev` (as an owner). Locally the panel writes straight to the files on your
computer (`scripts/panel-dev-api.mjs`): commit them by hand as usual.
Invitations work locally too, but the accounts they create are forgotten when
the dev server stops.

## Deploy

1. **GitHub token.** In GitHub → Settings → Developer settings → Fine-grained
   tokens, create one with access to **only** `amaranthw21/SW-Web` and these
   repository permissions: **Contents: Read and write**, **Pull requests: Read
   and write**. Note when it expires.

2. **Deploy the Worker** (needs a free Cloudflare account):

   ```bash
   cd worker
   npx wrangler login
   npx wrangler kv namespace create PANEL   # only the first time; put its id in wrangler.toml
   npx wrangler deploy
   npx wrangler secret put GITHUB_TOKEN      # paste the token
   npx wrangler secret put SESSION_SECRET    # paste a long random string
   ```

   For the random string, `openssl rand -base64 32` works.

3. **Owners.** Generate a hash of your password:

   ```bash
   node worker/hash-password.mjs
   ```

   Then store it with your user name:

   ```bash
   npx wrangler secret put ADMINS
   # {"belen":"pbkdf2$100000$..."}
   ```

   More owners go in the same object (`{"belen":"…","otra":"…"}`). Everyone
   else is invited from the panel.

   Paste the JSON at the prompt, never with `echo "…" |`: the shell eats the
   `$` parts of the hash. If an owner can't sign in, check the JSON and the
   password with `node worker/check-admins.mjs` (nothing is shown or saved)
   and run `secret put ADMINS` again.

4. **Point the site at it.** `.env.production` in the repo root holds the
   Worker's address (it isn't secret) and is committed:

   ```
   VITE_PANEL_API=https://sw-web-panel.amaranthw21.workers.dev
   ```

   To try the real Worker from `npm run dev`, put the same line in
   `.env.development.local` (ignored by git); delete it to go back to local
   mode.

## Publish directly or review first

In `wrangler.toml`:

- `EDIT_BRANCH = "panel-edits"` (the default): saves go to that branch and
  collect in one pull request. Someone with GitHub access merges it and the site
  updates. Good while the admins are new to the panel.
- `EDIT_BRANCH = "main"`: saves go live with the next deploy (~2 minutes), like
  the mods' edits in Sveltia.

Run `npx wrangler deploy` after changing it.

## Limits

- No limit on login attempts yet: passwords must be at least 10 characters.
- No deleting entries from the panel. That's done in Sveltia or on GitHub.
- Uploaded pictures are saved right away, even if the entry is never saved.
- If two admins edit the same file at once, the second one to save is told to
  reload instead of overwriting the first one's changes.
- Lists and the choices for "Related legendaries" come from the last deploy, so
  an entry created in the panel shows its file name until the next deploy.
