-- Duplicate all researches, segments and analyses to user Alexey Sibirtsev
-- Target user ID: dc63831a-e9ab-4cf8-9ae9-e61d96897900

-- First, duplicate researches with new Project IDs to avoid conflicts
INSERT INTO public.researches ("User ID", "Project ID", "Project name", description, status, created_at, updated_at)
SELECT 
  'dc63831a-e9ab-4cf8-9ae9-e61d96897900' as "User ID",
  CONCAT(r."Project ID", '_alexey_copy') as "Project ID", 
  CONCAT(r."Project name", ' (Copy for Alexey)') as "Project name",
  r.description,
  r.status,
  NOW() as created_at,
  NOW() as updated_at
FROM public.researches r
WHERE r."User ID" != 'dc63831a-e9ab-4cf8-9ae9-e61d96897900';

-- Duplicate segments with updated Project IDs
INSERT INTO public.segments ("Project ID", "Сегмент ID", "Название сегмента", description)
SELECT 
  CONCAT(s."Project ID", '_alexey_copy') as "Project ID",
  s."Сегмент ID",
  s."Название сегмента", 
  s.description
FROM public.segments s
JOIN public.researches r ON s."Project ID" = r."Project ID"
WHERE r."User ID" != 'dc63831a-e9ab-4cf8-9ae9-e61d96897900';

-- Duplicate segment analyses with updated Project IDs
INSERT INTO public.segment_analyses ("Project ID", "Сегмент ID", "Название сегмента", analysis_type, content)
SELECT 
  CONCAT(sa."Project ID", '_alexey_copy') as "Project ID",
  sa."Сегмент ID",
  sa."Название сегмента",
  sa.analysis_type,
  sa.content
FROM public.segment_analyses sa
JOIN public.researches r ON sa."Project ID" = r."Project ID"
WHERE r."User ID" != 'dc63831a-e9ab-4cf8-9ae9-e61d96897900';