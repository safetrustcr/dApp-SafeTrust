WITH ranked_primary_wallets AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id ASC
    ) AS primary_rank
  FROM public.user_wallets
  WHERE is_primary IS TRUE
)
UPDATE public.user_wallets AS wallet
SET is_primary = false
FROM ranked_primary_wallets AS ranked
WHERE wallet.id = ranked.id
  AND ranked.primary_rank > 1;

CREATE UNIQUE INDEX user_wallets_one_primary_per_user
  ON public.user_wallets (user_id)
  WHERE is_primary IS TRUE;
