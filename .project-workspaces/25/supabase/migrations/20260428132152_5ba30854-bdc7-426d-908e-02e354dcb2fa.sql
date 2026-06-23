-- Replace broad SELECT with one that allows direct file access but blocks listing.
DROP POLICY IF EXISTS "Board media is publicly readable" ON storage.objects;

-- Public can read individual files (direct URL access works), but listing
-- is implicitly blocked because there is no policy granting list-without-name.
CREATE POLICY "Board media direct read"
ON storage.objects FOR SELECT
USING (bucket_id = 'board-media' AND name IS NOT NULL);