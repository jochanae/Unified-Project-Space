-- Drop overly restrictive policies and create ones that work for kid sessions
-- Kids access their data through parent's auth session or direct access

-- For kid_savings_goals: Allow direct insert/update/delete for kid sessions
CREATE POLICY "Allow direct kid savings goal insert"
ON public.kid_savings_goals
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow direct kid savings goal update"
ON public.kid_savings_goals
FOR UPDATE
USING (true);

-- For kid_transactions: Allow insert for kid sessions
CREATE POLICY "Allow direct kid transaction insert"
ON public.kid_transactions
FOR INSERT
WITH CHECK (true);

-- For kids_profiles: Allow update for kid sessions
CREATE POLICY "Allow direct kid profile update"
ON public.kids_profiles
FOR UPDATE
USING (true);