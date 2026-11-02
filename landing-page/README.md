# OmniScan Landing Page

Static HTML landing page deployed at `omniscan.website`.

## Deploy

Import this folder (`landing-page/`) as an "Other" static project on Vercel.
- Build command: (leave empty)
- Output directory: `dist`
- Root directory: `landing-page`

## Config

Two values in `dist/index.html` control runtime behaviour:

- `VUE_APP_URL` — base URL of the Vue consumer app (default: `https://app.omniscan.website`)
- `APK_URL` — APK download URL; leave empty `''` for the coming-soon dialog, set to a URL to enable direct download

## Domain setup

- Landing page → `omniscan.website` (root domain)
- Vue app → reassign to `app.omniscan.website` in Vercel project settings (no code change needed)
