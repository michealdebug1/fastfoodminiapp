# Food Platform

Workspace for the customer-facing Telegram Mini App and the independent
restaurant administration application. Both applications use the shared
Supabase backend; the admin application is not part of the customer route tree.

## Workspace commands

```bash
npm install
npm run dev                 # Customer app, http://localhost:3000
npm run dev:admin           # Admin app, http://localhost:3001
npm run build               # Customer production build
npm run build:admin         # Admin production build
npm run typecheck           # Customer TypeScript check
npm run typecheck:admin     # Admin TypeScript check
npm run lint                # Customer lint
npm run test:customer       # Customer unit and localization tests
npm run typecheck:shared    # Shared contract package
```

The customer application remains in `apps/customer`. Its workspace package
retains the original `dev`, `build`, `start`, `lint`, and `typecheck` scripts.
The separate admin application lives in `apps/admin` and can be deployed
independently. It includes localized authentication, live restaurant operations,
order management, products and settings.

## Shared contracts and Supabase

- `packages/shared` contains dependency-free TypeScript contracts shared by
  frontend applications.
- `supabase/` contains the Supabase CLI configuration, future migrations,
  Edge Functions, and seed entry point.
- The customer app has browser and cookie-aware server Supabase clients under
  `apps/customer/src/lib/supabase`.
- Customer environment values belong in `apps/customer/.env.local` (ignored by
  Git). Use the project URL and publishable key there. A Supabase secret key is
  optional and server-only; never expose it as `NEXT_PUBLIC_*`.
- To link the local CLI configuration after signing in, run
  `supabase login`, then `supabase link --project-ref <project-ref>` from this
  workspace root.
- A linked cloud project is configured locally for project
  `wvvzrdmydwmicoxeggdb` (`fastfood-platform`, Sydney
  `ap-southeast-2`). Link metadata under `supabase/.temp/` is ignored by Git.

The restaurant database schema and RLS policies are maintained under
`supabase/migrations`. The customer storefront now reads the live menu and has
a pickup checkout implementation. Its additive order/status and cash-payment
migrations have been approved and applied to the linked production project.
Checkout still requires enabled Supabase Anonymous Sign-Ins. Online payments
and delivery are not implemented. Telegram identity uses an additive local
migration and server-only routes; those identity migrations and the Telegram
webhook remain unapplied/unconfigured in production.
