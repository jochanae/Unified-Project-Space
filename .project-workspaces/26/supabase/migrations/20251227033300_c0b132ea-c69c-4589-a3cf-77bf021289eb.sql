-- Strengthen plaid_items RLS to prevent direct token access

ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "No direct SELECT - use plaid_items_safe view" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can view their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can create their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can update their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can delete their own plaid items" ON public.plaid_items;

-- Block ALL direct SELECT - tokens must be accessed via secure functions only
-- Using RESTRICTIVE policy ensures this always applies
CREATE POLICY "Block direct SELECT on plaid_items"
ON public.plaid_items
AS RESTRICTIVE
FOR SELECT
TO public
USING (false);

-- Only authenticated users can insert their own plaid items
CREATE POLICY "Authenticated users can insert own plaid items"
ON public.plaid_items
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can update their own plaid items
CREATE POLICY "Authenticated users can update own plaid items"
ON public.plaid_items
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Only authenticated users can delete their own plaid items
CREATE POLICY "Authenticated users can delete own plaid items"
ON public.plaid_items
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
