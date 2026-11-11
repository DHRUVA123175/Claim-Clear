/*
# Fix search_path on update_updated_at_column function

1. Modified Functions
- `update_updated_at_column` — set explicit search_path to public for security.
*/

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
