# Dgtech Foods Oy Shift Planner

A responsive shift-planning web app for Dgtech Foods Oy.

The app includes employer/admin login, employee invite links, editable schedules, restaurant assignments, employee/team views, Finnish public holiday highlighting, and PDF/print reports.

## Features

- Employer/admin password login
- Up to 4 employer IDs
- Employee login creation through employer invite links
- Employees can view team schedules but cannot edit
- Year and month planning from 2026 to 2030
- Editable shift times, including custom times like `09:00-17:00`
- Restaurant assignment per employee/day
- Monthly, weekly, 3-week, employee, and restaurant PDF/print reports
- Sundays and Finnish public holidays shown in red
- Responsive layout for phone, tablet, laptop, and desktop

## Project Structure

```text
api/app.js              Vercel serverless backend
shiftplanner-app/       Frontend app
vercel.json             Vercel routing
package.json            Project metadata
```

## Deploy To Vercel

1. Import this GitHub repository into Vercel.
2. Use the project root as the root directory.
3. Keep framework/build settings as default or `Other`.
4. Add Redis storage from the Vercel Marketplace, for example Upstash Redis.
5. Make sure these environment variables are available in Vercel:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

6. Redeploy after adding environment variables.

Without Redis/KV environment variables, the app may run but data will not persist reliably on Vercel.

## First Use

1. Open the deployed app.
2. Create the first employer/admin login.
3. Add restaurants and employees in Settings.
4. Create employee invite links from Settings.
5. Send each invite link manually to the employee.
6. Employees create their own username/password from the invite link.

## Local Testing

The frontend can be opened directly, but backend login needs an HTTP server with `/api/app`.

For Vercel-style local testing, run with Vercel CLI:

```sh
npm run dev
```

## Notes

- The app does not send emails automatically yet.
- Employee verification happens through employer-created invite links.
- Employer/admin accounts can edit all schedules and settings.
- Employee accounts are read-only.
