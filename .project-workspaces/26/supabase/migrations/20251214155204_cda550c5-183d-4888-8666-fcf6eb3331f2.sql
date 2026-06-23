-- Add image_url column to credit_products for thumbnails
ALTER TABLE public.credit_products 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add category column for better organization
ALTER TABLE public.credit_products 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'credit_cards';

-- Update existing products with appropriate categories based on product_type
UPDATE public.credit_products SET category = 'credit_cards' WHERE product_type IN ('credit_card', 'secured_card', 'business_card');
UPDATE public.credit_products SET category = 'loans' WHERE product_type = 'personal_loan';
UPDATE public.credit_products SET category = 'banking' WHERE product_type IN ('banking_account', 'savings');
UPDATE public.credit_products SET category = 'kids' WHERE product_type = 'kids_product';