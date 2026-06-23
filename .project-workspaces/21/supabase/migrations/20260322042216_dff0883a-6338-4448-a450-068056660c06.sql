-- Restore Marcus's avatar from silk boxers back to original reference image
UPDATE connections 
SET avatar_url = 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/companion-avatars/4c54a4b7-8543-4798-aa33-9e6e074fad88/reference-1772323885812.jpg',
    reference_image_url = 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/companion-avatars/4c54a4b7-8543-4798-aa33-9e6e074fad88/reference-1772323885812.jpg'
WHERE member_id = 'created-marcus-1771956719' AND user_id = '4c54a4b7-8543-4798-aa33-9e6e074fad88';

-- Also restore profile-level avatar
UPDATE profiles 
SET companion_avatar_url = 'https://huycpvtosdmesucrobdr.supabase.co/storage/v1/object/public/companion-avatars/4c54a4b7-8543-4798-aa33-9e6e074fad88/reference-1772323885812.jpg'
WHERE user_id = '4c54a4b7-8543-4798-aa33-9e6e074fad88';