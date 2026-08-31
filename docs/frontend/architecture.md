# Frontend architecture

This document describes the current Next.js 14 App Router setup in `apps/frontend`, with the focus on routing, provider composition, data movement, middleware authorization, and environment variables.

## 1) App Router directory structure

The frontend is built with the App Router under `apps/frontend/src/app`.

```text
apps/frontend/src/app/
├── layout.tsx                  # root layout, provider composition
├── page.tsx                    # landing page / home route
├── login/
│   └── page.tsx
├── register/
│   └── page.tsx
├── forgot-password/
│   └── page.tsx
├── apartment/
│   ├── page.tsx
│   └── [id]/
│       ├── page.tsx
│       └── escrow/
│           ├── create/page.tsx
│           └── [escrowId]/page.tsx
├── dashboard/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── guest/
│   ├── apartments/
│   ├── escrow/
│   ├── escrow-dashboard/
│   ├── manager/
│   ├── messages/
│   ├── notifications/
│   ├── profile/
│   └── users/
├── api/
│   ├── auth/
│   ├── escrow/
│   └── messages/
├── webhooks/
│   └── escrow-status/route.ts
├── globals.css
└── helper/
    └── send-transaction/route.ts
```

### Responsibilities

- `app/` holds route pages, not a legacy `pages/` directory.
- Public and authenticated UI are split by route groups and middleware checks.
- Dashboard routes are protected by `src/middleware.ts`.
- `app/api/*` is used for route-level conveniences and server-side handling; business writes are intentionally delegated to the separate API service in `apps/api`.
- `app/webhooks/*` is the server side callback surface for external systems like `TrustlessWork` status updates.

## 2) Provider hierarchy

The root layout in `apps/frontend/src/app/layout.tsx` nests providers like this:

```tsx
<ThemeProvider>
  <ClientProviders>
    <TrustlessWorkProvider>
      {children}
      <Toaster />
    </TrustlessWorkProvider>
  </ClientProviders>
</ThemeProvider>
```

`ClientProviders` is defined in `apps/frontend/src/providers/ClientProviders.tsx`:

```tsx
<ApolloProviderWrapper>
  <PollarProvider>
    <PollarSessionSync>
      {children}
      <Toaster />
    </PollarSessionSync>
  </PollarProvider>
</ApolloProviderWrapper>
```

### Why this order matters

The composition is intentional:

1. `ThemeProvider` is the outermost browser-capable UI shell for light/dark theming.
2. `ClientProviders` is the client-only boundary. It creates the browser context for:
   - Apollo GraphQL reads (`ApolloProviderWrapper`)
   - Pollar embedded wallet state (`PollarProvider`)
   - wallet sync effects (`PollarSessionSync`)
3. `TrustlessWorkProvider` wraps the page tree after the client shell, so escrow configuration is available to page components without altering the wallet provider lifetime.

This ordering matters because `PollarProvider` is browser-dependent and optionally disabled when the publishable key is missing. It must live inside the client boundary (`ClientProviders`) so it can safely call `usePollar()`. It is deliberately outside `TrustlessWorkProvider` so the app still renders even when the Pollar key is absent, while the TrustlessWork SDK config remains a separate concern.

`TrustlessWorkProvider` itself is a thin wrapper around `@trustless-work/escrow`:

```tsx
<TrustlessWorkConfig
  baseURL={baseURL}
  apiKey={process.env.NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY ?? ""}
>
```

It reads `NEXT_PUBLIC_TRUSTLESS_WORK_ENV` and warns if the API key is not set.

## 3) Data flow

### Reads: Apollo → Hasura

Frontend reads are driven by Apollo Client from `apps/frontend/src/config/apollo.ts`:

```ts
const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL ?? "http://localhost:8080/v1/graphql",
  headers: {
    "x-hasura-admin-secret": process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET ?? "myadminsecretkey",
  },
});
```

This is used by GraphQL hooks like `useQuery`, `useMutation`, and `useSubscription` throughout the app.

Typical read flow:

```text
Page component
  -> Apollo query (GET_* in src/graphql/queries)
  -> Hasura GraphQL endpoint
  -> public.* tables (apartments, escrows, users, messages, etc.)
```

### Writes: fetch → apps/api

For mutating escrow actions, the frontend does not directly write the blockchain state. It calls the backend API service instead.

```text
Frontend page/component
  -> fetch(`${NEXT_PUBLIC_API_URL}/api/escrow/deploy`)
  -> apps/api service (port 3002)
  -> TrustlessWork API / business logic / DB sync
```

Examples from the app:

- `EscrowPayFlow.tsx` calls `/api/escrow/deploy`
- `useActiveWallet.ts` calls `/api/escrow/send-transaction`
- wallet sync calls `/api/auth/activate-wallet`

This separation is the core of the consolidation pattern: the frontend is mostly a UI layer, while the backend handles write-side orchestration and server secrets.

### Middleware role check

The auth middleware also reads role data from Hasura:

```ts
const role = await fetchUserRole(uid);
```

`fetchUserRole()` calls Hasura with the server-side `HASURA_GRAPHQL_URL` and `HASURA_ADMIN_SECRET`, then decides whether the user is guest or host.

## 4) Protected routes

The route guard lives in `apps/frontend/src/middleware.ts` and matches:

```ts
export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
```

### Route groups

```ts
const HOST_ONLY_ROUTES = [
  '/dashboard/apartments',
  '/dashboard/escrow-dashboard',
  '/dashboard/manager',
  '/dashboard/users',
];

const GUEST_ONLY_ROUTES = [
  '/dashboard/guest',
];
```

### Behavior

- No token on a `/dashboard/*` route → redirect to `/login?redirect=...&reason=unauthenticated`
- Authenticated user on `/login` or `/register` → redirect to `/dashboard`
- `/dashboard` without a role → redirect to the role-specific home (`/dashboard/guest` or `/dashboard/escrow-dashboard`)
- Guest visiting a host-only route → redirect to `/dashboard/guest?blocked=true`
- Host visiting a guest-only route → redirect to `/dashboard/escrow-dashboard`

The middleware checks a cached role cookie first, then falls back to Hasura-based `fetchUserRole(uid)` when needed.

## 5) Environment variables for `apps/frontend/.env.local`

The frontend uses a mix of public browser variables and server-only variables. The main rule is:

- `NEXT_PUBLIC_*` values are exposed to the browser bundle
- non-`NEXT_PUBLIC_` values stay on the server and are not accessible from client code

### Public/browser variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase client initialization |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase web app ID |
| `NEXT_PUBLIC_HASURA_GRAPHQL_URL` | Yes | Apollo endpoint for public reads |
| `NEXT_PUBLIC_BACKEND_URL` | Common | Backend auth sync endpoints, defaulting to the API service |
| `NEXT_PUBLIC_API_URL` | Common | Escrow write endpoints from the browser |
| `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY` | Optional | Enables embedded Pollar wallet support |
| `NEXT_PUBLIC_USE_HOTEL_MOCKS` | Optional | Toggle mock hotel data vs GraphQL |
| `NEXT_PUBLIC_TRUSTLESS_WORK_ENV` | Yes for escrow flows | `mainnet` or development network selection |
| `NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY` | Yes for escrow flows | TrustlessWork client auth |
| `NEXT_PUBLIC_PLATFORM_ADDRESS` | Optional | Platform wallet address in some flows |
| `NODE_ENV` | Usually set by Next | Runtime environment flag |

### Server-only variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `HASURA_GRAPHQL_URL` | Yes for middleware / server utilities | Server-side Hasura endpoint used by role lookup |
| `HASURA_ADMIN_SECRET` | Yes for server queries | Hasura admin secret for privileged role reads |
| `TRUSTLESS_WORK_WEBHOOK_SECRET` | Only for webhook route | Verifies incoming webhook callbacks |

> `apps/frontend/.env.example` is the template. The real local file is usually `apps/frontend/.env.local` and should be kept out of source control.

## 6) Tech stack

| Layer | Stack |
| --- | --- |
| App framework | Next.js 14 (App Router) |
| UI library | React 18 |
| GraphQL client | Apollo Client 3 |
| State management | Zustand |
| Auth / user identity | Firebase Auth |
| Styling | Tailwind CSS |
| Component system | shadcn/ui + Radix primitives |
| Stellar wallet integration | Freighter + Stellar Wallets Kit |
| Embedded wallet | Pollar React SDK |
| Escrow integration | Trustless Work escrow SDK |
| Notifications | Sonner |

## Summary

The SafeTrust frontend is organized around a very clear split:

- App Router pages handle UI and route logic
- `ClientProviders` sets up browser-only global dependencies
- Apollo is the read path to Hasura
- browser `fetch()` is the write path toward the backend service
- middleware enforces guest/host route access using Firebase + Hasura role resolution

This makes adding new pages or providers straightforward as long as contributors respect the same boundary: reads to Hasura, writes to the backend API, and browser-only providers inside the client boundary.
