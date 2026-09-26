-- Records changes that were applied directly, so the migration history matches the live database.
-- Client's Instagram handle shown (and linked) under each testimonial.
alter table public.testimonials add column if not exists instagram text;

-- The public "social" bucket also holds PDFs (Canva imports) and MP4 videos (stories/reels), up to 50 MB.
update storage.buckets
   set allowed_mime_types = array['image/png','image/jpeg','image/webp','application/pdf','video/mp4'],
       file_size_limit = 52428800
 where id = 'social';
