-- Drop existing policies that target public role
DROP POLICY IF EXISTS "Users can create their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can view their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can update their own plaid items" ON public.plaid_items;
DROP POLICY IF EXISTS "Users can delete their own plaid items" ON public.plaid_items;

-- Recreate policies targeting only authenticated users
CREATE POLICY "Users can create their own plaid items" 
ON public.plaid_items 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own plaid items" 
ON public.plaid_items 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own plaid items" 
ON public.plaid_items 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plaid items" 
ON public.plaid_items 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);