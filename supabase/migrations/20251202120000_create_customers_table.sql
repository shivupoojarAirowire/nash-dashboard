-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  company text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all customers
CREATE POLICY "Allow authenticated users to read customers"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert customers
CREATE POLICY "Allow authenticated users to insert customers"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update customers
CREATE POLICY "Allow authenticated users to update customers"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete customers
CREATE POLICY "Allow authenticated users to delete customers"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customers_updated_at();

COMMENT ON TABLE public.customers IS 'Customer management table';
