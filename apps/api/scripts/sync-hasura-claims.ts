/**
 * Backfill Hasura claims for every existing user (SafeTrust users + hotel users).
 *
 *   pnpm --filter @safetrust/api exec tsx scripts/sync-hasura-claims.ts            # all users
 *   pnpm --filter @safetrust/api exec tsx scripts/sync-hasura-claims.ts <uid> ...  # specific users
 *
 * Users must sign in again (or call getIdToken(true)) to receive the new claims.
 */
import 'dotenv/config';
import { initFirebaseAdmin } from '../src/lib/firebase-admin.ts';
import { executeGraphQL } from '../src/lib/hasura.ts';
import { syncHasuraClaims } from '../src/services/hasura-claims.ts';

declare const process: {
  argv: string[];
  exit(code?: number): never;
};

const ALL_UIDS = `
  query AllFirebaseUids {
    users { id }
    hotel_users(where: { firebase_uid: { _is_null: false } }) { firebase_uid }
  }
`;

async function main() {
  initFirebaseAdmin();

  let uids = process.argv.slice(2);
  if (uids.length === 0) {
    const data = await executeGraphQL<{
      users: Array<{ id: string }>;
      hotel_users: Array<{ firebase_uid: string }>;
    }>(ALL_UIDS, {});
    uids = [...new Set([...data.users.map((u) => u.id), ...data.hotel_users.map((u) => u.firebase_uid)])];
  }

  let ok = 0;
  let failed = 0;
  for (const uid of uids) {
    try {
      const claims = await syncHasuraClaims(uid);
      console.log(`✅ ${uid} → ${claims['x-hasura-allowed-roles'].join(', ')}`);
      ok += 1;
    } catch (err) {
      // Seed rows without a Firebase account land here — expected, not fatal.
      console.warn(`⚠️  ${uid}: ${err instanceof Error ? err.message : String(err)}`);
      failed += 1;
    }
  }
  console.log(`\nDone: ${ok} updated, ${failed} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});