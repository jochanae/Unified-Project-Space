
-- ICE Emergency Contacts table
CREATE TABLE public.ice_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT,
  phone_number_encrypted TEXT,
  relationship TEXT NOT NULL DEFAULT 'Other',
  notify_on_crisis BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ice_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only CRUD their own contacts
CREATE POLICY "Users can view their own ICE contacts"
  ON public.ice_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ICE contacts"
  ON public.ice_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ICE contacts"
  ON public.ice_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ICE contacts"
  ON public.ice_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- PII encryption trigger for phone numbers
CREATE OR REPLACE FUNCTION public.encrypt_ice_contact_pii()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.phone_number IS NOT NULL AND NEW.phone_number != '' THEN
    NEW.phone_number_encrypted := public.pii_encrypt(NEW.phone_number);
    NEW.phone_number := NULL;
  ELSE
    NEW.phone_number_encrypted := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER encrypt_ice_pii
  BEFORE INSERT OR UPDATE ON public.ice_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_ice_contact_pii();

-- Decrypted view for server-side access
CREATE OR REPLACE VIEW public.ice_contacts_decrypted
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  name,
  public.pii_decrypt(phone_number_encrypted) AS phone_number_decrypted,
  relationship,
  notify_on_crisis,
  created_at
FROM public.ice_contacts;

-- Add timezone to profiles for push notification quiet hours
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
