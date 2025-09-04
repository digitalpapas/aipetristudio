-- Fix search_path warnings by updating existing functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.match_documents(filter jsonb, match_count integer, query_embedding vector)
RETURNS TABLE(id uuid, content text, embedding vector, metadata jsonb, created_at timestamp without time zone, similarity double precision)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
   select
 	id,
 	content,
 	embedding,
 	metadata,
 	created_at,
 	1 - (embedding <=> query_embedding) as similarity
   from QA
   order by embedding <=> query_embedding
   limit match_count;
$function$;