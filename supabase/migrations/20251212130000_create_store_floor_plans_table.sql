-- Create table to store floor plan metadata
CREATE TABLE IF NOT EXISTS public.store_floor_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_url text,
  uploaded_by uuid DEFAULT NULL,
  uploaded_at timestamptz DEFAULT now()
);

-- RLS: allow authenticated users to insert (optional - adjust as needed)
ALTER TABLE public.store_floor_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated insert" ON public.store_floor_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated select" ON public.store_floor_plans
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.store_floor_plans IS 'Metadata for floor plan files uploaded per store (store_code)';
