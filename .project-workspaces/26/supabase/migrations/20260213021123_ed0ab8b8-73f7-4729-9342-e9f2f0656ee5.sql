
-- Make receipts bucket private so URLs aren't publicly accessible
UPDATE storage.buckets SET public = false WHERE id = 'receipts';
