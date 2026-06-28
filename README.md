# FarmPulse

A production-ready farm management app for tracking poultry, rabbits, pigs,
egg production, expenses, sales, vaccinations, and activity history —
with real login accounts and a Postgres database, deployable on Vercel.

This is a rebuild of the original Figma-make prototype: same design
(agrarian-brutalist, parchment + forest green) and the same features, but now
with:

- **Real persistence** — Postgres via [Neon](https://neon.tech) (Vercel's managed Postgres)
- **Login accounts** — email/password auth via NextAuth, admin + worker roles
- **A "Team" page** — admins can add or remove worker accounts
- **A production Next.js app** ready to deploy to Vercel

## 1. Push to GitHub

```bash
cd farmpulse
git init
git add .
git commit -m "Initial commit: FarmPulse"
gh repo create farmpulse --private --source=. --push
# or, without the GitHub CLI:
# create an empty repo on github.com, then:
# git remote add origin https://github.com/<you>/farmpulse.git
# git branch -M main
# git push -u origin main
```

## 2. Create a Postgres database

In the [Vercel dashboard](https://vercel.com/dashboard): **Storage → Create
Database → Postgres** (this is powered by Neon). Note the connection string
it gives you — you'll need it as `DATABASE_URL`.

## 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. Connect the Postgres database you just created to this project (Vercel
   does this automatically if you create the DB from inside the project's
   **Storage** tab — it will set `DATABASE_URL` for you).
3. Add these Environment Variables in **Project Settings → Environment Variables**:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | (filled in automatically if you linked the DB in Storage) |
   | `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | your production URL, e.g. `https://farmpulse.vercel.app` |

4. Click **Deploy**.

## 4. Run migrations + create your first admin login

Once deployed (or even locally), run these with `DATABASE_URL` pointed at
your Neon database:

```bash
npm install
npm run db:generate   # generates SQL migration files from the schema
npm run db:migrate    # applies them to your database
npm run db:seed       # creates the first admin user + a little starter data
```

By default the seed script creates:

- Email: `admin@farmpulse.app`
- Password: `ChangeMe123!`

Override these by setting `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` before
running `npm run db:seed` (recommended — change the password right away).

**Log in, then go to the "Team" link in the header to add accounts for your
workers** (each gets their own email/password; choose role "worker" unless
they should also manage the team).

## Local development

```bash
cp .env.example .env
# fill in DATABASE_URL (you can use the same Neon DB, or a local Postgres)
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Visit `http://localhost:3000`, log in with the seeded admin account.

## Project structure

```
src/
  app/
    login/              Login page
    (app)/dashboard/     Main farm app (protected)
    (app)/team/          Admin user management (protected)
    api/
      auth/[...nextauth] NextAuth login endpoint
      records/[table]    Generic CRUD API for all farm record tables
      users/             Admin-only team management API
  components/
    FarmApp.tsx          The full farm management UI (dashboard, poultry,
                         rabbits, pigs, egg log, expenses, sales,
                         vaccinations, activity log)
  db/
    schema.ts            Drizzle ORM schema (Postgres tables)
    index.ts              DB client
    migrate.ts / seed.ts  One-off scripts (run via `npm run db:migrate` / `db:seed`)
  lib/
    auth.ts               NextAuth configuration
    useSyncedRecords.ts   Hook that keeps the UI's local state in sync with
                          the database automatically
  middleware.ts            Protects /dashboard, /team, and the API routes
```

### Recent updates

- **Rabbit table column order**: Status and Cage now appear before Age and Weight.
- **Pregnant-status bug fix**: selecting "Pregnant" now actually saves the
  bred date and kindle date to the rabbit (it previously only saved the
  status). The kindle date also auto-fills 31 days after the cross date
  (rabbit gestation), and the field is labeled "Date Pregnant / Crossed"
  while pregnant.
- **Edit Rabbit**: breed, sex, date of birth, and weight can now be edited
  after the fact — Tag ID stays fixed as the permanent identifier.
- **Poultry age auto-tracking**: flocks now have an optional Hatch Date.
  When set, age is computed live (in weeks) every time the page loads, so it
  never goes stale. Existing flocks without a hatch date keep showing their
  previously-entered age until you edit them to add one — nothing is lost.
- **Activity log overhaul**: every add, edit, and delete across every
  section is now logged automatically, and each entry shows who performed
  it (pulled from the logged-in account).
- **App branding**: proper page title, description, favicon, and a web app
  manifest so FarmPulse behaves like a real installable web app.

### Updating your existing Supabase database

Since you're applying this by hand in the Supabase SQL Editor, here's just
the new, additive SQL for this update (safe to run — it doesn't touch any
existing data):

```sql
ALTER TABLE "activity" ADD COLUMN "performed_by" text DEFAULT '';
ALTER TABLE "flocks" ADD COLUMN "hatch_date" text DEFAULT '';
```

If you're running everything fresh, just use `drizzle/0000_jittery_paibok.sql`
→ `0001_nasty_glorian.sql` → `0002_fixed_paibok.sql` in order instead.

### Rabbit housing (cages)

Rabbits can be assigned to cages, and a cage can hold multiple rabbits. From
the **Rabbits** screen:

- **"Manage Cages"** opens a panel to create cages (name, location, capacity,
  notes) and see how many rabbits are currently in each one.
- Every rabbit row has a **Cage** dropdown for quick reassignment — no
  separate form needed.
- A red banner appears if a cage's rabbit count exceeds its capacity.
- Deleting a cage doesn't delete its rabbits — they just become unassigned.

### How data persistence works

Every farm record table (flocks, rabbits, pigs, egg logs, expenses, sales,
vaccinations, activity) is backed by a Postgres table and a generic REST API
at `/api/records/<table>`. The `useSyncedRecords` hook lets the UI keep
calling `setFlocks(prev => [...])` exactly like the original prototype did —
it transparently figures out which records were added, edited, or removed
and syncs them to the database in the background.

### Adding more workers later

Any admin can open **Team** from the header and add a new worker account
(name, email, temporary password). Workers can log in immediately and use
the full app; only admins can see the Team page.

## Customizing

- **Currency**: the UI formats money as `GHS` (Ghanaian cedi) — search for
  `fmt = (n: number) =>` in `src/components/FarmApp.tsx` to change it.
- **Branding/colors**: design tokens live in `src/styles/globals.css`.
