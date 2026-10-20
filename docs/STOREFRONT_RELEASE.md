# Modern Indian Atelier storefront

The homepage uses live catalog photos and prices. Editorial selection prefers the
named maroon lehenga and red/white suit when those slugs exist; it never creates a
missing product. The current catalog has no active “Maroon Velvet Designer Lehenga
Set” listing. Campaign copy, launch slides and event banners remain visible.

The fixed header, root scroll lock, cart, wishlist, quick view, tracking, customer
account and custom-fit routes remain in place. The new `app/atelier.css` contains
the editorial layouts; colour tokens stay in `app/brand.css`.

## Google Analytics

- Existing property: `G-7QM5DMJ34G`. Optional build-time override:
  `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
- Next Script loads the tag after hydration, in production only.
- The CSP allows Google's tag and Analytics collection hosts.
- Page views are emitted once per public pathname transition. Query strings,
  fragments, referrer queries, account, admin, checkout and order pages are excluded.
- **Before release, in GA4 → Admin → Data streams → this web stream → Enhanced
  measurement, turn off automatic page views/history tracking and automatic form
  interactions.** This implementation sends manual page views. Google documents
  that `send_page_view: false` alone does not disable enhanced history events:
  https://developers.google.com/analytics/devguides/collection/ga4/views
- Verify initial entry, a product navigation, back navigation and a private route
  in GA4 DebugView/Realtime. No purchase/revenue events are inferred from browser
  order success URLs; financial reporting remains in the existing admin panel.
- No GA account access or receipt of production events was verified during local development.

## Newsletter

Apply `supabase/migrations/20261020000000_newsletter_subscribers.sql` to the
deployment database **after explicit approval**. It creates a private, RLS-enabled
table. Only the server service role can write or read subscriber addresses.
The public endpoint checks origin, limits requests, validates consent/email,
and reports storage failures rather than pretending a signup succeeded.

The form collects email opt-ins; campaign sending is not implemented. Support
handles unsubscribe/deletion requests by deleting the corresponding subscriber
record. Do not send campaigns without an operational unsubscribe process.
No database migration was applied by this code change.
