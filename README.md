# Item Master Update App

Item Master Update – prompt for Item (scan or enter), search item master, and display item details (description, dimensions, weight, image). Same theming, logo, auth, and URL parameters as Driver Pickup.

## Features

- **Authentication**: ORG-based auth (manual or `?Organization=XXX`)
- **URL parameters**: `Organization`, `Item` (pre-fill and optional auto-search)
- **Item input**: Manual entry or camera barcode/QR scan
- **Item search**: Calls `/item-master/api/item-master/item/search`; displays ItemId, Description, Original Length/Width/Height/Weight, and Image (or “no image” placeholder)
- **Editable fields**: All displayed fields except Item ID are editable
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

Configured for Vercel. Push to GitHub and connect the repo to Vercel. Use the **main** branch.

## API

- `POST /api/validate`
  - `action: 'app_opened'` – track app usage  
  - `action: 'auth'` – authenticate with ORG  
  - `action: 'ha-track'` – send events to HA webhook  
  - `action: 'search_item'` – search item master by `itemId` (requires auth). Uses `Query: "ItemId = '...'"`, `Size: 200`, and a `Template` for ItemId, Description, OriginalLength, OriginalWidth, OriginalHeight, OriginalWeight, ImageUrl.

## Usage

1. Enter ORG and authenticate, or use `?Organization=XXX` for auto-auth.
2. Optionally use `?Item=YYY` to pre-fill and auto-search that item after auth.
3. Enter or scan an item and press Enter (or scan) to search.
4. Review and edit item details. Image is shown when present; otherwise a “no image” placeholder is displayed.
