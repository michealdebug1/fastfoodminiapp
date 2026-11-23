# Food Platform Admin

Independent Next.js application for restaurant operations. It lives in its own
workspace and has its own styling, configuration, environment variables, build
and deployment lifecycle. It uses shared contracts from `@food-platform/shared`
and is prepared to use the existing Supabase project.

## Development

From the monorepo root:

```bash
npm install
npm run dev:admin
```

The admin app uses port `3001` by default so it can run beside the customer
app's default development server.

Quality checks:

```bash
npm run typecheck:admin
npm run test:admin
npm run build:admin
```

Copy `.env.example` to `.env.local` for a deployment environment. Only the
project URL and publishable key belong in browser configuration. Never expose a
Supabase secret key through `NEXT_PUBLIC_*`.

Staff sign in uses Supabase Auth cookies. Staff membership and role are checked
server-side against the shared `restaurant_staff`, `roles` and `restaurants`
tables; no public registration or role assignment is available. The dashboard,
orders, products and settings routes require an active staff membership.
Order-processing staff can access orders only; managers and administrators can
access all four areas.

## Operations modules

The Orders module reads restaurant-scoped order, address, item, selected-extra,
payment and immutable status-history records. Order status mutations run only
through server actions, use an expected-current-status compare-and-set, and are
validated by the database transition trigger. The database writes status
history and audit records. The dashboard and order queue recognize the
pickup-specific `ready_for_pickup` and `completed` states while retaining legacy
delivery states so existing orders can still be processed. Cash payments can
be marked received through a role-checked server action and database RPC;
online payment providers are not integrated. The RPC is defined in
`20261122223200_in_person_payment_confirmation.sql`, which has been approved
and applied to the linked production project.

The Products module supports localized Uzbek/Russian names and descriptions,
category filtering, UZS pricing, availability, option groups, extras and
soft-archiving. Product and option forms use Zod validation. Product images use
the public-read `restaurant-product-images` bucket; upload and deletion use the
authenticated server session and restaurant-scoped Storage policies. Images
are limited to JPEG, PNG or WebP and 4 MB by the admin form.

Restaurant settings edit the existing restaurant profile and
`restaurant_settings` values through server actions and role-scoped RLS. The
current restaurant schema has single-value name/description columns, so those
fields are not bilingual. Working hours are stored in the existing JSON field
and interpreted in Asia/Tashkent. The interface controls pickup availability;
legacy delivery-related database values are preserved but are no longer
editable through this screen.

The versioned migration
`supabase/migrations/20261122184000_phase3d_admin_operations_security.sql`
adds restaurant-profile update privileges for administrators/managers, a
product image bucket and scoped Storage policies. It does not create business
tables or alter existing rows.

The dashboard uses the `get_restaurant_dashboard` security-invoker RPC from the
versioned Supabase migration. The RPC enforces administrator/manager
membership, relies on existing RLS, and returns bounded aggregates and recent
activity rather than downloading order history. Reporting boundaries use
`Asia/Tashkent`; the chart offers seven daily buckets or eight weekly buckets.
Gross order value excludes cancelled orders, while collected revenue uses only
verified payment records. Amounts are formatted as UZS. Customer names are
not collected for new pickup orders; details are shown when available on
legacy orders. Dashboard refresh is manual, with no Realtime subscription.

`supabase/tests/phase3c_dashboard.sql` contains rollback-only live database
checks for the RPC response, aggregate results, and administrator, manager,
order-staff, non-staff and anonymous access.

`supabase/tests/phase3d_admin_operations.sql` contains rollback-only live
checks for restaurant/product/settings access, order transition validation,
Storage upload authorization, public image reads and role denials. It creates
fictional auth records only inside a transaction that explicitly rolls back.
