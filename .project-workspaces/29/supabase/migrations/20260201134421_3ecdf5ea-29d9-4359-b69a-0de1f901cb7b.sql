-- Fix function search path for generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    code TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        code := upper(substring(md5(random()::text) from 1 for 8));
        SELECT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_check;
        IF NOT exists_check THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$;