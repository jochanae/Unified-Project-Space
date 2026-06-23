
-- Drop the FK constraint linking gift_id to virtual_gifts
ALTER TABLE public.user_gift_purchases
  DROP CONSTRAINT IF EXISTS user_gift_purchases_gift_id_fkey;

-- Change gift_id from uuid to text so it can store string item IDs from code inventory
ALTER TABLE public.user_gift_purchases
  ALTER COLUMN gift_id TYPE text USING gift_id::text;
