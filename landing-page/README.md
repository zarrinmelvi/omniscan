# OmniScan Landing Page

Static HTML landing page deployed at `omniscan.website`.

## Deploy to Vercel

Import `landing-page/` as an "Other" static project:
- Build command: (leave empty)
- Output directory: `dist`
- Root directory: `landing-page`

Attach `omniscan.website` to this project.
Reassign the Vue app's domain from `omniscan.website` to `app.omniscan.website`.

## Operator config (inside `dist/index.html`)

| Constant | Default | Purpose |
|---|---|---|
| `VUE_APP_URL` | `https://app.omniscan.website` | Vue consumer app base URL |
| `APK_URL` | `''` | APK download URL — empty shows coming-soon dialog |
