-- Migration: 20261011000004_seed_max_participation_quotas.sql
-- Description: Seed festival category quotas into max_participation table

INSERT INTO public.max_participation (phase, off_max, on_max, total_max, group_max)
VALUES
  ('Foundation', 3, 2, 4, 2),
  ('Thamheediyya', 4, 3, 5, 3),
  ('Aliya', 5, 4, 6, 4),
  ('PG', 5, 4, 6, 4),
  ('General', 3, 3, 5, 3)
ON CONFLICT (phase) DO UPDATE
  SET off_max = EXCLUDED.off_max,
      on_max = EXCLUDED.on_max,
      total_max = EXCLUDED.total_max,
      group_max = EXCLUDED.group_max;
