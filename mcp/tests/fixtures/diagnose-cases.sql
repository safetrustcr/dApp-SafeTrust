-- Seeds the three escrows diagnose-escrow must explain (#531) into a LOCAL
-- SafeTrust database. Re-runnable: rows are upserted, and the "submitted" case
-- is re-stamped to now() so it reads as "awaiting confirmation" for 10 minutes.
--
--   docker compose -f infra/backend/docker-compose.yml exec -T postgres \
--     psql -U postgres -d postgres -v synced_tx=<hash> \
--     < mcp/tests/fixtures/diagnose-cases.sql
--
-- synced_tx must be the hash of any SUCCESSFUL Stellar Testnet transaction
-- (for example one from `pnpm testnet:provision`), because diagnose-escrow asks
-- Testnet Horizon whether it landed. Then, in the MCP client:
--
--   diagnose-escrow { engagementId: "rental:mcp-fixture:built" }      → Built, not signed
--   diagnose-escrow { engagementId: "rental:mcp-fixture:submitted" }  → Submitted, not confirmed yet
--   diagnose-escrow { engagementId: "rental:mcp-fixture:synced" }     → Confirmed and synced
--
-- escrow_transactions is append-only, so the audit rows are inserted once
-- (by fixed id) and never removed. Use a disposable local database.

\set guest '\'GMCPFIXTUREGUESTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\''
\set host  '\'GMCPFIXTUREHOSTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\''

INSERT INTO public.escrows (id, contract_id, engagement_id, property_id, sender_address, receiver_address, amount, status, tenant_id)
VALUES
  ('0b1f0000-0000-4000-8000-000000000001', 'rental:mcp-fixture:built', 'rental:mcp-fixture:built', 'mcp-fixture', :guest, :host, 1200, 'pending_signature', 'safetrust'),
  ('0b1f0000-0000-4000-8000-000000000002', 'CMCPFIXTURESUBMITTED', 'rental:mcp-fixture:submitted', 'mcp-fixture', :guest, :host, 1200, 'created', 'safetrust'),
  ('0b1f0000-0000-4000-8000-000000000003', 'CMCPFIXTURESYNCED', 'rental:mcp-fixture:synced', 'mcp-fixture', :guest, :host, 1200, 'funded', 'safetrust')
ON CONFLICT (engagement_id) DO NOTHING;

INSERT INTO public.escrow_pending_actions
  (id, engagement_id, contract_id, action, tx_hash, unsigned_xdr, built_for_uid, signer_address, status, created_at, expires_at, submitted_at)
VALUES
  ('0b1f0000-0000-4000-8000-0000000000a1', 'rental:mcp-fixture:built', NULL, 'initialize',
   'mcpfixture00000000000000000000000000000000000000000000000000built', 'fixture-xdr', 'mcp-fixture-guest', :guest,
   'built', now(), now() + interval '1 day', NULL),
  ('0b1f0000-0000-4000-8000-0000000000a2', 'rental:mcp-fixture:submitted', 'CMCPFIXTURESUBMITTED', 'fund',
   'mcpfixture000000000000000000000000000000000000000000000submitted', 'fixture-xdr', 'mcp-fixture-guest', :guest,
   'submitted', now(), now() + interval '1 day', now()),
  ('0b1f0000-0000-4000-8000-0000000000a3', 'rental:mcp-fixture:synced', 'CMCPFIXTURESYNCED', 'fund',
   :'synced_tx', 'fixture-xdr', 'mcp-fixture-guest', :guest,
   'submitted', now(), now() + interval '1 day', now())
ON CONFLICT (id) DO UPDATE SET
  created_at = EXCLUDED.created_at, expires_at = EXCLUDED.expires_at,
  submitted_at = EXCLUDED.submitted_at, tx_hash = EXCLUDED.tx_hash;

INSERT INTO public.escrow_transactions (id, engagement_id, contract_id, action, from_status, to_status, tx_hash, source, tenant_id)
VALUES
  ('0b1f0000-0000-4000-8000-0000000000b2', 'rental:mcp-fixture:submitted', 'CMCPFIXTURESUBMITTED', 'initialize',
   'pending_signature', 'created', NULL, 'submit', 'safetrust'),
  ('0b1f0000-0000-4000-8000-0000000000b3', 'rental:mcp-fixture:synced', 'CMCPFIXTURESYNCED', 'fund',
   'created', 'funded', :'synced_tx', 'submit', 'safetrust')
ON CONFLICT (id) DO NOTHING;
