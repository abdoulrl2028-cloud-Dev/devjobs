<p align="center">
  <img src="https://raw.githubusercontent.com/abdoulrl2028-cloud-Dev/abdoulrl2028-cloud-Dev/main/assets/projects/jobs.jpg" alt="DevJobs" width="100%">
</p>

# DevJobs

Public tech job board. The frontend uses **Next.js and TypeScript**, the backend is a **REST API** (Next.js route handlers), and the layout is fully responsive with **dark mode**.

**Live site:** [https://devjobs-peach-six.vercel.app](https://devjobs-peach-six.vercel.app)

## Features

- Job list with search by role, company, or skill
- Filters for location, job type, remote jobs, and sponsored jobs
- Detail page with requirements, responsibilities, benefits, and a view count
- Saved jobs, synced to the database for signed-in users
- Cookie session login and sign-up for candidates or companies
- **Company portal:** publish jobs, featured plans, payments (Stripe or demo mode), metrics, and applications
- **Talent pool** (Pro and Company plans) and public candidate profiles
- **Admin panel:** moderate jobs, users, companies, and revenue
- Dark mode that follows the system
- Phone, tablet, and desktop layouts

## Plans

| Plan | Price | Jobs | Duration | Includes |
| --- | --- | --- | --- | --- |
| Free | R$ 0 | 1 | 15 days | Basic listing |
| Featured | R$ 49 | 1 | 30 days | Featured badge |
| Pro | R$ 149 | 5 | 30 days | Talent pool |
| Company | R$ 299/month | Unlimited | Monthly | Everything, plus priority support |

## Technologies

- [Next.js](https://nextjs.org) (App Router)
- [TypeScript](https://www.typescriptlang.org)
- REST API (`app/api/*`)
- Portable database: **SQLite** (`node:sqlite`) in development, **Postgres** in production
- [Stripe](https://stripe.com) for payments, with a demo mode
- Responsive CSS variables for light and dark themes

## Run locally

Requires **Node.js 22+**. The dev server stays on your computer. It is not a public link.

```bash
npm install
npm run dev
```

Without `DATABASE_URL`, the app uses SQLite (`./data/devjobs.db`). The database, migrations, and seed data are created on the first run.

### Payments

Without a Stripe key, checkout runs in **demo mode** and is approved immediately. For the real flow, set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env.local`. See `.env.example`.

### Demo accounts (created by the seed)

- `demo@devjobs.com` / `talento123` — candidate
- `empresa@devjobs.com` / `empresa123` — company (StartupX, Company plan)
- `admin@devjobs.com` / `admin123` — administrator
- Talent pool: `talento1@devjobs.com` through `talento7@devjobs.com` / `talento123`

## REST API

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/jobs` | List jobs (`q`, `location`, `type`, `remote`) |
| GET | `/api/jobs/:id` | Job details |
| GET | `/api/jobs/sponsored` | Sponsored jobs |
| GET | `/api/locations` | Available locations |
| POST | `/api/auth/login` | Log in (email and password) |
| POST | `/api/auth/logout` | End the session |
| GET | `/api/auth/me` | Current user (session cookie) |
| POST | `/api/register` | Register a candidate or a company |
| POST | `/api/jobs/:id/apply` | Apply to a job |
| GET/POST/DELETE | `/api/favorites` | Saved jobs for the signed-in user |
| GET/POST | `/api/company/jobs` | Company jobs and publishing |
| GET | `/api/company/stats` | Company metrics and payments |
| GET | `/api/talents` | Talent pool (Pro/Company) |
| GET | `/api/admin/summary` | Revenue and metrics (admin) |

## Security

- Security headers on every response: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `HSTS`, and `Permissions-Policy`.
- Per-IP rate limits: login and register (5/min), other auth routes (30/min), and the general API (120/min).
- Passwords hashed with `scrypt` and compared in constant time.
- `Origin` and `Referer` checks on login and logout.
- Input checks for email format, password length, body size, and allowed query values.
- Session cookies are `httpOnly`, `SameSite=Lax`, and `Secure` in production.
- Company, admin, and talent routes require a session and the right role.

## Deploy

The project is published on Vercel: [https://devjobs-peach-six.vercel.app](https://devjobs-peach-six.vercel.app). Manual deploy: `vercel --prod --yes`.

In production, set:

- `AUTH_SECRET` (required)
- `DATABASE_URL` (Postgres — SQLite is not persistent on serverless)
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` when real charges are enabled
