# Dgtech foods Oy Shift Planner

Web app for planning shifts, restaurant assignments, employee totals, weekly totals, PDF/print reports, and protected employer/employee access.

## Run

For the public app, deploy the repository root to Vercel. The frontend lives in `shiftplanner-app/` and the backend API lives in `api/app.js`.

For local frontend-only testing you can still open `index.html`, but login data will only be local. For backend testing, run a Vercel-compatible dev server.

```sh
npm run dev
```

Then open the URL printed by Vercel, usually `http://localhost:3000/`.

## Vercel storage

The backend uses Upstash/Vercel-compatible Redis REST environment variables:

```sh
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

Add a Redis/KV storage integration from the Vercel Marketplace and connect it to the project. Without those variables, the API falls back to `/tmp` storage for local testing only, which is not durable on Vercel.

## Roles

Employer accounts can edit schedules, employees, restaurants, reports, invites, and up to 4 employer IDs.

Employee accounts are created from employer invite links. Employees can see their own schedule and the team schedule, but cannot edit the planner.
