# Bun Run

A mobile-first ordering experience for a **single** fast-food restaurant, built to
run as a Telegram Mini App and as a normal web app. Uzbek is the default
language; Russian is available at `/ru`.

## Stack

- Next.js 16 (App Router, Turbopack) with React 19 and strict TypeScript
- Tailwind CSS 4 with design tokens in `src/styles/globals.css`
- next-intl for routing, formatting and messages
- Framer Motion for restrained motion, Lucide for icons
- Nunito (display) + Manrope (body), with Latin Extended and Cyrillic subsets

## Getting started

```bash
npm install                            # run from the workspace root
npm run dev --workspace=@food-platform/customer
```

The root workspace also provides `npm run dev`, `npm run build`,
`npm run lint`, and `npm run typecheck` as shortcuts for this application.

Quality gates:

```bash
npm run typecheck
npm run lint
npm run test:customer
npm run build
npm run start      # serve the production build
```

## Routes

| Path            | Purpose                                        |
| --------------- | ---------------------------------------------- |
| `/`             | Uzbek storefront (default, no locale prefix)   |
| `/ru`           | Russian storefront                             |
| `/about`        | Uzbek restaurant information                   |
| `/ru/about`     | Russian restaurant information                 |
| `/{locale}/...` | Localized 404 for unknown paths (including `/en`) |

`localePrefix` is `as-needed`, so Uzbek URLs stay clean and `/uz/...` redirects
to the unprefixed path. Locale detection uses the `NEXT_LOCALE` cookie first,
then `Accept-Language`.

## Project structure

```text
src/
  app/[locale]/            App Router entry points
  (shop)/                Storefront layout + pages
    about/               Restaurant information page
    [...rest]/             Localized catch-all 404
  components/              Shared layout and UI primitives
  config/restaurant.ts     Brand, currency and time zone
  features/
    menu/                  Live catalog, options, product cards and services
    cart/                  Reducer, provider, storage, pricing, sheet
    orders/                Customer order-status controls
    telegram/              Mini App bootstrap and optional identity linking
  i18n/                    Routing, navigation, request config
  lib/                     Fonts, cn helper, constants, Telegram bridge
  messages/                uz.json (source of truth) and ru.json
  styles/globals.css       Design tokens and base styles
  types/                   Message typings and Telegram declarations
```

Data access goes through service modules so the UI does not know where data
comes from:

- `features/menu/services/menu-service.ts` → `getMenuCatalog()` reads the active
  restaurant, pickup settings, available products, categories and extras from
  Supabase.
- `features/cart/cart-storage.ts` → validated, versioned `localStorage`
  persistence.
- `features/cart/components/cart-sheet.tsx` → establishes an anonymous Supabase
  Auth session and calls the server-side `place_pickup_order` RPC with an
  idempotency key.
- `app/api/telegram/` → verifies Telegram Mini App `initData`, accepts only the
  Telegram sender's own contact through the bot webhook, and supports optional
  phone-based account recovery.
- `app/[locale]/(shop)/orders/[id]/page.tsx` → reads a customer’s order and
  status history through existing RLS policies.

The checkout RPC recalculates prices and validates product/extra availability
in PostgreSQL; browser totals are display-only. New orders use pickup, cash,
UZS, and an initially pending payment.

## Localization

- `src/messages/uz.json` defines the message shape (`src/types/messages.ts`).
- `src/messages/ru.json` must keep identical keys; there is no English catalog.
- Add a locale by extending `locales` in `src/i18n/routing.ts` and adding the
  matching JSON catalog under `src/messages/` (the request config imports it
  dynamically).
- Uzbek copy uses the Latin script, the polite “siz” form and proper `oʻ`/`gʻ`
  characters (U+02BB), so the fonts include the `latin-ext` subset.
- Customer UZS prices use deterministic formatting so server and browser output
  match; order timestamps use next-intl formatting.

## Cart

The cart is client-side and survives reloads:

- Storage key: `bunrun.cart.v2`, versioned and validated on read.
- Stale product ids and corrupt payloads degrade to an empty cart.
- Pricing and totals are pure functions in `features/cart/lib/pricing.ts`.
- Checkout uses a persistent idempotency key with an in-page fallback when
  browser storage is blocked, keeps the cart on failure, and clears the key
  only after the database confirms order creation.
- Payment is collected at the restaurant; the customer app has no online
  payment gateway or delivery-address flow.

## Telegram

`features/telegram/telegram-bootstrap.tsx` calls `ready()`, `expand()` and sets
the header/background colors when the page runs inside Telegram. The identity
panel verifies signed, fresh `initData` server-side. Linking requires explicit
consent, sharing the customer's own Telegram contact in a private bot chat, and
confirming the link in the Mini App. SMS recovery is a separate optional opt-in
using Supabase Auth. The bridge is accessed through `lib/telegram.ts`, which
returns `null` in a normal browser.

## Environment

`apps/customer/.env.local` supplies the Supabase project URL and publishable
key for the browser and cookie-aware server clients. It is ignored by Git.
Copy `.env.example` to `.env.local` when setting up another environment. Never
put a Supabase secret key in a `NEXT_PUBLIC_*` variable or commit it.

Checkout creates an anonymous Supabase Auth identity for customer-scoped RLS.
Telegram identity is optional and is never inferred from client-side Telegram
fields; signed `initData` and the bot-owned contact flow are verified server-side.

## Current limitations

- The additive order/status and cash-payment migrations
  `supabase/migrations/20261122223000_pickup_order_statuses.sql`,
  `20261122223100_pickup_order_creation.sql`, and
  `20261122223200_in_person_payment_confirmation.sql` have been approved and
  applied to the linked production project.
- Supabase Anonymous Sign-Ins must be enabled for customer checkout; the
  project settings endpoint does not expose whether that specific option is on.
- The identity workflow requires the additive migrations
  `20261123195900_customer_telegram_identity.sql` and
  `20261123210000_customer_telegram_workflow.sql` and
  `20261123214400_telegram_webhook_idempotency.sql`, plus server-only
  `SUPABASE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, and
  `TELEGRAM_WEBHOOK_SECRET`. The migrations have not been applied to production,
  and the bot webhook has not been configured or tested against Telegram.
- Supabase phone authentication and an SMS provider must be configured before
  optional recovery can be enabled. The local `supabase/config.toml` does not
  configure `auth.sms`; hosted Auth/SMS settings were not inspected.
- Customer order status still uses manual refresh; live customer order tracking
  is not part of this phase.
- Telegram linking does not add names or phone numbers to orders; anonymous
  checkout remains guest-based and existing legacy order data is unchanged.
- Staff administration is available only in the separate `apps/admin` app.

## Telegram production deployment checklist

This checklist is preparation only. No production migration, deployment, bot
configuration, or credential change has been performed.

### Supabase

- Review and test the additive migrations in order:
  `20261123195900_customer_telegram_identity.sql`,
  `20261123210000_customer_telegram_workflow.sql`, and
  `20261123214400_telegram_webhook_idempotency.sql`. Apply them only after
  explicit approval and a verified remote migration state.
- Keep Anonymous Sign-Ins enabled if anonymous pickup checkout is intended.
  Do not disable it as part of Telegram linking.
- Enable the Phone provider in Supabase Auth. Configure an SMS provider
  (supported examples include Twilio, MessageBird, Vonage, or TextLocal), its
  sender credentials, permitted destination countries, OTP template, expiration
  and rate limits. Configure CAPTCHA/rate limits against SMS abuse.
- Test phone enrollment and recovery with a non-production project and test
  numbers before enabling real SMS delivery. Recovery must resolve to the
  already-linked Supabase profile; do not merge accounts by phone number.
- See the
  [Supabase phone sign-in guide](https://supabase.com/docs/guides/auth/phone-login).

### Vercel environment

- Set `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the customer app.
- Set `SUPABASE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_BOT_USERNAME`, and `TELEGRAM_WEBHOOK_SECRET` as server-only
  customer-app environment variables in the correct Vercel environment.
- Use a unique random webhook secret of 32–256 characters using only letters,
  digits, `_` or `-`. Never use a `NEXT_PUBLIC_` prefix for private keys or bot
  credentials. Do not copy secret values into source files, command history,
  preview environments, or logs.
- Keep the admin app's Supabase publishable configuration separate. Redeploy
  only after environment values are reviewed; no deployment is performed by
  this checklist.

### Telegram

- Create/verify the bot with BotFather and set `TELEGRAM_BOT_USERNAME` to its
  exact username. Keep the bot token only in the server secret store.
- Configure the Mini App HTTPS domain and launch URL in BotFather. Point it to
  the customer app's Uzbek storefront entry URL; verify Russian selection
  remains available inside the app.
- Configure the webhook URL as
  `https://<customer-host>/api/telegram/webhook` using Telegram's `setWebhook`
  method. Set its `secret_token` to the exact server-side
  `TELEGRAM_WEBHOOK_SECRET`, request only the required `message` updates, and
  confirm the URL and pending-update state with `getWebhookInfo`.
- Verify Telegram's `X-Telegram-Bot-Api-Secret-Token` header reaches the route
  unchanged. Do not enable the bot until the webhook and server credentials are
  set in the same environment.
- Follow Telegram's
  [Mini App initialization and validation guidance](https://core.telegram.org/bots/webapps)
  and [Bot API webhook guidance](https://core.telegram.org/bots/api#setwebhook).

### Staging acceptance

- Use a separate staging Supabase project, Vercel environment, and Telegram bot.
- Verify valid, expired, and tampered `initData`; webhook secret rejection;
  duplicate Telegram update handling; private-chat and own-contact checks; and
  challenge expiry.
- Verify optional phone enrollment/recovery reaches only the existing linked
  profile, and that declining either consent flow leaves checkout usable.
- Run checkout regression tests. If an end-to-end order is needed, use a
  clearly synthetic staging order only; never use a real customer's order.
