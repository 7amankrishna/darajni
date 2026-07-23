-- Add PayU without invalidating historical Razorpay records. The old enum
-- value and columns are intentionally retained so existing orders remain
-- readable after the gateway migration.
alter type public.payment_method add value if not exists 'payu';

alter table public.orders
  add column if not exists payu_txn_id text,
  add column if not exists payu_payment_id text;

comment on column public.orders.payu_txn_id is
  'Merchant-generated PayU transaction ID used to reconcile the hosted checkout response.';
comment on column public.orders.payu_payment_id is
  'PayU mihpayid only after the server verifies the successful transaction.';
