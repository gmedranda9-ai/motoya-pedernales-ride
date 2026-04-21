-- Add live driver location columns to viajes
ALTER TABLE public.viajes
  ADD COLUMN IF NOT EXISTS conductor_lat double precision,
  ADD COLUMN IF NOT EXISTS conductor_lng double precision,
  ADD COLUMN IF NOT EXISTS origen_lat double precision,
  ADD COLUMN IF NOT EXISTS origen_lng double precision,
  ADD COLUMN IF NOT EXISTS conductor_loc_actualizado_en timestamptz;

-- Ensure realtime captures full row updates so the passenger receives lat/lng
ALTER TABLE public.viajes REPLICA IDENTITY FULL;

-- Add table to the supabase_realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'viajes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.viajes';
  END IF;
END $$;
