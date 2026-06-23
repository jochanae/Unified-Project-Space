-- Drop the existing constraint and add expanded product types
ALTER TABLE credit_products DROP CONSTRAINT IF EXISTS credit_products_product_type_check;

ALTER TABLE credit_products ADD CONSTRAINT credit_products_product_type_check 
CHECK (product_type IN ('credit_card', 'personal_loan', 'secured_card', 'business_card', 'banking_account', 'savings', 'kids_product'));