-- Remove broad SELECT policies that allow listing all files in public buckets.
-- Public buckets still serve files via direct URL access through the storage CDN.
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view bike images" ON storage.objects;
DROP POLICY IF EXISTS "Avatars listing for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Bike images listing for authenticated users only" ON storage.objects;