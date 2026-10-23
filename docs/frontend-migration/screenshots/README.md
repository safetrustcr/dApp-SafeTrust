# Frontend visual evidence (issue #519)

Screenshots of the **source UI** that `inventory.md` and `routes.md` describe, captured from a real browser against a locally built copy of [`safetrustcr/frontend-SafeTrust`](https://github.com/safetrustcr/frontend-SafeTrust) at the pinned commit. They illustrate what phases P3 (public discovery) of `plan.md` is porting into `apps/frontend`; they are **not** screenshots of `apps/frontend` itself.

## Provenance

| Item | Value |
| --- | --- |
| Source repository | `safetrustcr/frontend-SafeTrust` |
| Source commit | `c46c11593312bf0a8b9de445107293eb9a9dbea3` (merge commit of PR #644, equals `origin/main`) |
| Destination base | `dApp-SafeTrust@3e120c5063f8fe866d6425a471c12f49541d38ee` |
| Installation | `npm ci` on Node 22.23.2 |
| Build / serve | `pnpm build` equivalent (`next build`), served with `next start` on `127.0.0.1` |
| Capture tool | Playwright Chromium 1.56, `deviceScaleFactor: 1`, no zoom |
| Theme | `colorScheme` + the app's persisted theme key set to `light` / `dark` before first paint |
| Viewports | 360 × 800 (mobile), 768 × 1024 (tablet), 1280 × 900 (desktop) |
| Environment | `NEXT_PUBLIC_DEMO_MODE=true` and `NEXT_PUBLIC_USE_AUTH_EMULATOR=true`, Firebase demo config — no production project, no real user data |

Because the app runs with its demo flag on, the thin banner at the top of every image ("You're viewing SafeTrust with demo listings…") is part of the local capture environment, not of the ported design. The banner is produced by `demo-badge` (classified as `copy` in `inventory.md` §5.14).

## Files

All images show the **source UI** (`frontend-SafeTrust`) — the design being migrated.

| File | Route | Screen | Width | Theme |
| --- | --- | --- | --- | --- |
| `source-home-360-light.jpg` | `/` | Public home — hero | 360 px | light |
| `source-home-360-dark.jpg` | `/` | Public home — hero | 360 px | dark |
| `source-home-768-light.jpg` | `/` | Public home — hero | 768 px | light |
| `source-home-768-dark.jpg` | `/` | Public home — hero | 768 px | dark |
| `source-home-1280-light.jpg` | `/` | Public home — hero | 1280 px | light |
| `source-home-1280-dark.jpg` | `/` | Public home — hero | 1280 px | dark |
| `source-rent-360-light.jpg` | `/rent` | Listing + filter sidebar | 360 px | light |
| `source-rent-360-dark.jpg` | `/rent` | Listing + filter sidebar | 360 px | dark |
| `source-rent-768-light.jpg` | `/rent` | Listing + filter sidebar | 768 px | light |
| `source-rent-768-dark.jpg` | `/rent` | Listing + filter sidebar | 768 px | dark |
| `source-rent-1280-light.jpg` | `/rent` | Listing + filter sidebar | 1280 px | light |
| `source-rent-1280-dark.jpg` | `/rent` | Listing + filter sidebar | 1280 px | dark |
| `source-room-360-light.jpg` | `/room` | Room detail — gallery, price, booking bar | 360 px | light |
| `source-room-360-dark.jpg` | `/room` | Room detail — gallery, price, booking bar | 360 px | dark |
| `source-room-768-light.jpg` | `/room` | Room detail — gallery, price, booking bar | 768 px | light |
| `source-room-768-dark.jpg` | `/room` | Room detail — gallery, price, booking bar | 768 px | dark |
| `source-room-1280-light.jpg` | `/room` | Room detail — gallery, price, booking bar | 1280 px | light |
| `source-room-1280-dark.jpg` | `/room` | Room detail — gallery, price, booking bar | 1280 px | dark |

Routes map to `apps/frontend` as follows (`routes.md` §3): `/` → `/`, `/rent` → `/rent`, `/room` → `/apartment/[id]`.

Each image is a viewport screenshot, not a full-page capture: at 1280 px the pages are taller than the 900 px window, so below-the-fold sections are intentionally not shown.

## Capture checks

Recorded from the same browser session that produced the images:

| Route | `<h1>` | Images decoded | Dark class + body background | Horizontal overflow at 360 px |
| --- | --- | --- | --- | --- |
| `/` | "Book stays with your deposit protected by escrow on Stellar" | 5 of 8 (3 brand SVGs are hidden, 0 × 0, not broken) | `dark` / `rgb(2, 8, 23)` | none |
| `/rent` | "Available for rent in Costa Rica" | 20 of 20 | `dark` / `rgb(2, 8, 23)` | none |
| `/room` | "Room Gallery" | 10 of 10 | `dark` / `rgb(2, 8, 23)` | none |

## What is deliberately not captured

There are no screenshots of the **current destination UI** (`apps/frontend`) in this set. At the pinned base `3e120c5` that app does not render reliably in the review environment:

- `pnpm build` fails on `apps/frontend/src/components/ui/card.tsx` (`JCardTitle` syntax error) and on `apps/api` type errors — recorded in `baseline.md` §2.
- The dev server serves `/rent`, but recompiles `/login` (the root redirect target) into the same `card.tsx` syntax error and the process exits; repeated attempts to screenshot `/rent` after that point returned a closed connection.

Producing "destination UI" images would therefore have meant patching `card.tsx`, which is P0 work and outside issue #519's documentation-only scope. The contrast between the two UIs is described in `inventory.md`; the only visual evidence available without code changes is the source UI above.

## Regenerating

```bash
git clone https://github.com/safetrustcr/frontend-SafeTrust /tmp/frontend-SafeTrust
cd /tmp/frontend-SafeTrust && git checkout c46c11593312bf0a8b9de445107293eb9a9dbea3 && npm ci && npm run build
NEXT_PUBLIC_DEMO_MODE=true NEXT_PUBLIC_USE_AUTH_EMULATOR=true npx next start -p 3123
```

Then capture `/`, `/rent` and `/room` at 360 × 800, 768 × 1024 and 1280 × 900 in both themes with a Playwright script that sets the app's theme key (`safetrust-theme`) before navigation and waits ~5 s after `commit` for hydration.
