# Item Master Update App

Item Master Update – prompt for Item (scan or enter), same theming, logo, auth, and URL parameters as Driver Pickup. **Item APIs will be added once the app shell is built.**

## Features

- **Authentication**: ORG-based auth (manual or `?Organization=XXX`)
- **URL parameters**: `Organization`, `Item` (pre-fill)
- **Item input**: Manual entry or camera barcode/QR scan
- **Theming**: Same themes as Driver Pickup (Manhattan, Love's, MSC, etc.)
- **Logo**: Manhattan Associates logo
- **Analytics**: HA webhook tracking (app_opened, auth, etc.)

## Setup

### Environment variables (Vercel)

- `MANHATTAN_PASSWORD` – Manhattan WMS password  
- `MANHATTAN_SECRET` – Manhattan OAuth client secret  
- `HA_WEBHOOK_URL` (optional) – Home Assistant webhook for usage tracking  

### Local development

```bash
npm install
npm run dev
```

### Deployment

Configured for Vercel. Push to GitHub and connect the repo to Vercel.

## API (current)

- `POST /api/validate`
  - `action: 'app_opened'` – track app usage  
  - `action: 'auth'` – authenticate with ORG  
  - `action: 'ha-track'` – send events to HA webhook  

**Item-related API actions will be added later.**

## Usage

1. Enter ORG and authenticate, or use `?Organization=XXX` for auto-auth.
2. Optionally use `?Item=YYY` to pre-fill the Item field after auth.
3. Enter or scan an item in the Item field.
4. Item APIs (e.g. validate, update) to be implemented next.
