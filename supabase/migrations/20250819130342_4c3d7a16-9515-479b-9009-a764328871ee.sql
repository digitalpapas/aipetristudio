-- Duplicate all data from user 26df8d01-5bd6-40a0-9439-1252d0c844a3 to user 2819bc5f-35b6-417c-931e-ec05dee4143b (Тест)

-- First, duplicate researches with new Project IDs to avoid conflicts
INSERT INTO public.researches ("User ID", "Project ID", "Project name", description, status, created_at, updated_at)
SELECT 
  '2819bc5f-35b6-417c-931e-ec05dee4143b' as "User ID",
  CONCAT(r."Project ID", '_test_copy') as "Project ID", 
  CONCAT(r."Project name", ' (Copy for Test)') as "Project name",
  r.description,
  r.status,
  NOW() as created_at,
  NOW() as updated_at
FROM public.researches r
WHERE r."User ID" = '26df8d01-5bd6-40a0-9439-1252d0c844a3';

-- Duplicate segments with updated Project IDs
INSERT INTO public.segments ("Project ID", "Сегмент ID", "Название сегмента", description)
SELECT 
  CONCAT(s."Project ID", '_test_copy') as "Project ID",
  s."Сегмент ID",
  s."Название сегмента", 
  s.description
FROM public.segments s
WHERE s."Project ID" IN (
  SELECT "Project ID" FROM public.researches 
  WHERE "User ID" = '26df8d01-5bd6-40a0-9439-1252d0c844a3'
);

-- Duplicate segment analyses with updated Project IDs
INSERT INTO public.segment_analyses ("Project ID", "Сегмент ID", "Название сегмента", analysis_type, content)
SELECT 
  CONCAT(sa."Project ID", '_test_copy') as "Project ID",
  sa."Сегмент ID",
  sa."Название сегмента",
  sa.analysis_type,
  sa.content
FROM public.segment_analyses sa
WHERE sa."Project ID" IN (
  SELECT "Project ID" FROM public.researches 
  WHERE "User ID" = '26df8d01-5bd6-40a0-9439-1252d0c844a3'
);

-- Duplicate FileStorage records with updated project_id
INSERT INTO public."FileStorage" ("User ID", "project_id", "User message", "Assistant ID", "embedding", "Счетчик", "Project name", "User Email")
SELECT 
  '2819bc5f-35b6-417c-931e-ec05dee4143b' as "User ID",
  CONCAT(fs."project_id", '_test_copy') as "project_id",
  fs."User message",
  fs."Assistant ID", 
  fs."embedding",
  fs."Счетчик",
  fs."Project name",
  fs."User Email"
FROM public."FileStorage" fs
WHERE fs."project_id" IN (
  SELECT "Project ID" FROM public.researches 
  WHERE "User ID" = '26df8d01-5bd6-40a0-9439-1252d0c844a3'
);