# Aviator Pro MLM (Next.js + Turso/libsql) — PRD v1.0

Fake-trading gaming + network marketing platform. No real Aviator game: the Play
screen is a visual simulation. Daily income is a FIXED 1% of active investment
via cron. PDF rules: bot tiers 5%/6%/8% (brackets), 3X cap, 365 days,
5-level first-recharge 5/2/1/1/1, 10-level ROI 6/3/2/2/1..., 20 milestones.

## Run on localhost
```bash
cd "C:\Users\kjass\Desktop\MLM"
cp .env.example .env
npm install
npm run dev
# open http://localhost:3000  (dev server may already run on :3002)
```
Pages: `/ /about /plans /rewards /terms` (guests) · `/register?ref=AV100001`
`/login` `/forgot` · `/dash /dash/play /dash/recharge /dash/withdraw /dash/bot`
`/dash/business-plan /dash/team /dash/run /dash/activity /dash/profile /dash/support`
· `/admin` (admin@aviatorpro.local / Admin123!, referral AV100001).

DB auto-creates `local.db` on first API call (migrates old DBs too).

## Key flows (all verified E2E)
- **OTP registration (mandatory):** register → 6-digit OTP → verify → active.
  Without SMTP settings, OTP prints in server log + returns as `devOtp`.
  Login is blocked until verified; blocked users can't login.
- **Recharge (admin approval):** submit BEP20 TX hash → `pending`, nothing
  credited → Admin → Deposits → Approve (credits Principal + 5-level
  first-recharge commission) / Reject with remark.
- **Play (visual only):** full-screen fake chart + live feed (100 Indian names,
  new entry every 3s) + bets (max 10/day). Bets move NO money.
- **Daily 1% cron:** `POST /api/cron/roi?secret=CRON_SECRET` credits 1% of each
  active bot to ROI wallet + 10-level ROI commissions, enforces 3X cap
  (partial final credit → `capped`) and 365-day expiry. Idempotent per day.
  Schedule daily via Vercel Cron.
- **Withdrawal:** min $2, 10% charge, ONLY 7:00–10:00 AM IST (server-enforced),
  Pending → admin Approve/Paid or Reject (refunds debit to Principal).
- **Milestones:** claim button in Business Plan when self+team thresholds met,
  credited once per tier to Reward wallet.
- **Campaigns (Vietnam Ticket):** `/dash/campaigns` list + detail with KPI
  progress bars + DONE badges, dual criteria (Leadership: self $1k + L2–L10
  $10k + direct $10k, or Self: $10k + direct $10k), leaderboard (seeded demo
  rows, deletable), achievement toast + home banner (dismissible).
  Admin → Campaigns tab: create/edit (dates, criteria JSON), clear demo
  board, remove achievers. Achievements also evaluated nightly in ROI cron.
- **Ledger:** every money movement in `ledger` (user recent-tx + dashboard).

## Push to GitHub
```bash
git init; git add .; git commit -m "Aviator Pro MLM PRD v1"
gh repo create aviator-pro --private --source=. --push
```
(videos, `local.db`, `.env` are gitignored.)

## Turso + Vercel (final)
```bash
turso db create aviator-pro
turso db show aviator-pro --url
turso db tokens create aviator-pro
```
Vercel env: `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `JWT_SECRET` /
`BEP20_DEPOSIT_ADDRESS` / `CRON_SECRET`. Add daily Vercel Cron:
`POST /api/cron/roi?secret=...`. No migration step — tables self-create
on first request (`/api/health`).

## Admin panel tabs
Overview · Users (search, block/unblock, KYC approve/reject, manual
credit/debit, change sponsor, reset password) · Deposits (approve/reject) ·
Withdrawals (approve/reject+refund) · Settings (min deposit/withdrawal,
charge %, ROI %, withdraw window, maintenance mode, deposit address, SMTP)
· Reports (totals + CSV export users/deposits/withdrawals/commissions).
