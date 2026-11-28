DROP TRIGGER IF EXISTS escrow_transactions_no_update_delete ON public.escrow_transactions;
DROP FUNCTION IF EXISTS public.escrow_transactions_append_only();
DROP TABLE IF EXISTS public.escrow_transactions;
