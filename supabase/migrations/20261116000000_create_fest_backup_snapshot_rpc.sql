-- Migration: Create RPC to produce complete database backup snapshot in a single call
CREATE OR REPLACE FUNCTION get_fest_backup_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'timestamp', now(),
    'appeals', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM appeals t), '[]'::jsonb),
    'chest_no', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM chest_no t), '[]'::jsonb),
    'code_letters', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM code_letters t), '[]'::jsonb),
    'late_registrations', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM late_registrations t), '[]'::jsonb),
    'points_matrix', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM points_matrix t), '[]'::jsonb),
    'prefest_registrations', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM prefest_registrations t), '[]'::jsonb),
    'submission_entries', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM submission_entries t), '[]'::jsonb),
    'registrations', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM registrations t), '[]'::jsonb),
    'results', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM results t), '[]'::jsonb),
    'volunteers', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM volunteers t), '[]'::jsonb),
    'colleges', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM colleges t), '[]'::jsonb),
    'students', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM students t), '[]'::jsonb),
    'events', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM events t), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_fest_backup_snapshot() TO service_role;
