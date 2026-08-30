-- Fix: coupons/vouchers always failed at checkout with SQLSTATE 42702
-- (ambiguous_column). resolve_promo_discount declares RETURNS TABLE columns
-- named `code` and `promo_code_id`, which are the same names as columns on
-- promo_codes / promo_redemptions. Bare references in the WHERE clauses were
-- ambiguous between the output parameter and the table column, so Postgres
-- (variable_conflict = error, the default) aborted before any discount could
-- be computed. This redefines the function with fully-qualified column
-- references so the lookup is unambiguous. Pure create-or-replace; grants and
-- callers (quote_checkout_discount, create_checkout_order) are unchanged.

create or replace function public.resolve_promo_discount(
  p_promo_code text,
  p_subtotal numeric,
  p_phone text default null,
  p_lock boolean default false
)
returns table (
  promo_code_id uuid,
  code text,
  code_type public.promo_code_type,
  discount_type public.promo_discount_type,
  discount_amount numeric,
  discounted_subtotal numeric,
  message text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_code text := public.normalize_promo_code(p_promo_code);
  v_promo public.promo_codes%rowtype;
  v_phone_last10 text;
  v_total_redemptions integer;
  v_phone_redemptions integer;
  v_discount numeric(12, 2);
begin
  if v_code = '' then
    raise exception 'Enter a coupon or voucher code';
  end if;

  if p_subtotal <= 0 then
    raise exception 'A coupon or voucher needs a valid cart subtotal';
  end if;

  if p_lock then
    select *
    into v_promo
    from public.promo_codes
    where promo_codes.code = v_code
    for update;
  else
    select *
    into v_promo
    from public.promo_codes
    where promo_codes.code = v_code;
  end if;

  if not found then
    raise exception 'Coupon or voucher code is not valid';
  end if;

  if not v_promo.is_active then
    raise exception 'Coupon or voucher code is not active';
  end if;

  if v_promo.starts_at is not null and v_promo.starts_at > now() then
    raise exception 'Coupon or voucher code is not active yet';
  end if;

  if v_promo.ends_at is not null and v_promo.ends_at <= now() then
    raise exception 'Coupon or voucher code has expired';
  end if;

  if p_subtotal < v_promo.minimum_subtotal then
    raise exception 'Cart subtotal is below the minimum required for this code';
  end if;

  select count(*)::integer
  into v_total_redemptions
  from public.promo_redemptions
  where promo_redemptions.promo_code_id = v_promo.id;

  if v_promo.usage_limit is not null
     and v_total_redemptions >= v_promo.usage_limit then
    raise exception 'Coupon or voucher code has reached its usage limit';
  end if;

  v_phone_last10 := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  if char_length(v_phone_last10) = 10 then
    select count(*)::integer
    into v_phone_redemptions
    from public.promo_redemptions
    where promo_redemptions.promo_code_id = v_promo.id
      and promo_redemptions.phone_last10 = v_phone_last10;

    if v_phone_redemptions >= v_promo.per_phone_limit then
      raise exception 'This phone number has already used this code';
    end if;
  end if;

  v_discount := public.calculate_promo_discount(
    v_promo.discount_type,
    v_promo.discount_value,
    p_subtotal,
    v_promo.maximum_discount
  );

  if v_discount <= 0 then
    raise exception 'Coupon or voucher code does not reduce this order';
  end if;

  return query
  select
    v_promo.id,
    v_promo.code,
    v_promo.code_type,
    v_promo.discount_type,
    v_discount,
    round(p_subtotal - v_discount, 2),
    case
      when v_promo.code_type = 'voucher' then 'Voucher applied'
      else 'Coupon applied'
    end;
end;
$$;
