# Housing Management Portal – Interactive Demo

A clickable prototype of the **Housing Management & Resident Services Portal** for an affordable-housing project of 1,584 apartments in 43 towers (24 Type B towers, 19 Type E towers).

It runs fully in the browser with **fictional mock data**: no backend and no real payments. Changes are saved in your browser's local storage; use **Reset demo data** on the sign-in screen to start over.

> The production system is proposed on **ASP.NET Core, Blazor and Microsoft SQL Server**. This React demo exists only to walk stakeholders through the workflows before the build.

## Roles and what to try

| Role | Try this |
| --- | --- |
| **Allottee** (Ahmed Raza, B-07-302) | Pay the October bill online or upload a slip · raise a complaint · register a tenant · request an NOC once dues are clear |
| **Tenant** | Can only view and pay maintenance bills for one apartment |
| **Association** | Verify or reject payment slips (duplicate-reference check) · record cash and print a receipt · assign and resolve complaints · vendors and agreements · petty cash and expenses |
| **Management (Authority)** | Collection dashboard · generate bills for selected allottees with a preview · apply late surcharge · issue unpaid notices · approve NOCs and print the certificate · announcements and public notice board · auditable reports with CSV export · billing rules |
| **System admin** | Users, roles and rights · apartment and allottee master data |

**Suggested end-to-end walkthrough:** Allottee uploads a slip → Association confirms it → Allottee requests an NOC → Management approves it and prints the certificate.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL that Vite prints (usually http://localhost:5173).

## Deploy

Every push to `main` builds the app and publishes it to **GitHub Pages** through `.github/workflows/deploy.yml`. To turn this on once, go to the repo's **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Stack

React 19 · TypeScript · Vite. There is no UI or chart library; styling is plain CSS.
