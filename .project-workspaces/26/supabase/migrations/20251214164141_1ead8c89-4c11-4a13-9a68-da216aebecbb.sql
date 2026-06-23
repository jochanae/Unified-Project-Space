-- Create table for MFA recovery codes
CREATE TABLE public.mfa_recovery_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for quick lookup
CREATE INDEX idx_mfa_recovery_codes_user ON public.mfa_recovery_codes(user_id);

-- Enable RLS
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- Users can only view their own recovery codes
CREATE POLICY "Users can view own recovery codes"
ON public.mfa_recovery_codes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own recovery codes
CREATE POLICY "Users can create own recovery codes"
ON public.mfa_recovery_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update (mark as used) their own recovery codes
CREATE POLICY "Users can update own recovery codes"
ON public.mfa_recovery_codes
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own recovery codes (when regenerating)
CREATE POLICY "Users can delete own recovery codes"
ON public.mfa_recovery_codes
FOR DELETE
USING (auth.uid() = user_id);