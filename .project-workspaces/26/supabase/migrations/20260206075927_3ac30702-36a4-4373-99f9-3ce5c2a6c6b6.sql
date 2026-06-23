-- Drop and recreate the public view to include website_url and calendar_url (safe public URLs)
DROP VIEW IF EXISTS public.professionals_public;

CREATE VIEW public.professionals_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    name,
    title,
    specialty,
    bio,
    avatar_url,
    website_url,      -- Safe: public business website
    calendar_url,     -- Safe: public scheduling link
    is_featured,
    is_verified,
    is_active,
    rating,
    review_count,
    created_at,
    updated_at,
    specialties,
    states_licensed,
    partner_id,
    qr_code_url
    -- Explicitly NOT returning: contact_email, user_id, claim_token, claimed_at, stripe_connect_account_id, payout_method
  FROM public.professionals;

-- Grant select on the public view
GRANT SELECT ON public.professionals_public TO anon, authenticated;