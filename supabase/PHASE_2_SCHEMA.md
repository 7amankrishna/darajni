# Phase 2 commerce schema

Migration: `migrations/20260625020000_ecommerce_core.sql`

## Data model

- `categories`: public product grouping
- `products`: normalized category reference, prices, percentage discount,
  inventory, available sizes, and product-image URLs
- `orders`: active guest orders and payment/status metadata
- `order_items`: immutable product name, size, quantity, and price snapshots
- `archived_orders`: minimal lifecycle record for delivered orders
- `admin_users`: Supabase Auth identities authorized for administration
- `settings`: singleton public store configuration

No customer profile or avatar table exists. Customer contact and delivery data is
stored only on the order for which it is required.

## Security model

- Public users can read active products, categories, and public settings.
- Orders and order items are not directly readable or writable by anonymous users.
- Guest checkout will use a validated server action with the server-only service
  role in Phase 3.
- The rate-limited application tracking route calls the server-only
  `track_order(order_reference, phone)` RPC. Direct anonymous RPC access is
  denied, and only status metadata is returned after both values match.
- Authenticated administrators are identified only through `admin_users`.
- Product image reads are public; writes are restricted to administrators.
- The bucket accepts JPEG, PNG, and WebP files up to 2 MiB.

## First administrator

Existing administrators are copied from the old `profiles` table during migration.
For a fresh project with no previous administrator, create the Auth user first and
then run a reviewed statement from the Supabase SQL editor:

```sql
insert into public.admin_users (id)
select id
from auth.users
where email = 'owner@example.com';
```

## Application compatibility

This migration intentionally removes the legacy customer profile and review tables.
The remaining legacy screens will be replaced by the guest checkout, tracking, and
new admin modules in Phases 3 and 4. Apply the migration only when the deployment
window is approved.
