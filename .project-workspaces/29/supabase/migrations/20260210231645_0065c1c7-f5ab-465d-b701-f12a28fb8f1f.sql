
-- Prevent duplicate portfolios per user
ALTER TABLE public.paper_portfolios ADD CONSTRAINT paper_portfolios_user_id_unique UNIQUE (user_id);
