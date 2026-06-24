-- Product photos are compressed in the admin browser before upload. This limit
-- also prevents unoptimized files from bypassing the normal upload flow.
update storage.buckets
set file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'product-images';
