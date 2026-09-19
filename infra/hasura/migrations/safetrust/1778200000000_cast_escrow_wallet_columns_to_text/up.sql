ALTER TABLE public.trustless_work_escrows
  ALTER COLUMN marker   TYPE TEXT,
  ALTER COLUMN approver TYPE TEXT,
  ALTER COLUMN releaser TYPE TEXT,
  ALTER COLUMN resolver TYPE TEXT;
