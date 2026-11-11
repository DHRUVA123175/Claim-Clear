/*
  Restrict client-created cases to their uploaded document path.
  Payment and workflow state must only be changed by trusted server-side functions.
  This is additive so it can be applied after the existing case-mutation hardening migration.
*/

REVOKE INSERT ON TABLE public.cases FROM PUBLIC, anon, authenticated;
GRANT INSERT (file_path) ON TABLE public.cases TO authenticated;

DROP POLICY IF EXISTS "insert_own_cases" ON public.cases;
CREATE POLICY "insert_own_cases"
  ON public.cases FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND file_path IS NOT NULL
    AND split_part(file_path, '/', 1) = auth.uid()::text
    AND file_path !~ '(^|/)\.\.?(/|$)'
  );
