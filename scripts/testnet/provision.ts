import { Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { config as loadDotenv } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const envLocalPath = path.join(repoRoot, '.env.testnet.local');
const defaultNetworkPassphrase = Networks.TESTNET;
const defaultHorizonUrl = 'https://horizon-testnet.stellar.org';
const testAssetCode = 'USDC';
const minTestnetXlm = 100;
const minAssetBalance = 1;

const userTemplates = [
  { role: 'guest', email: 'guest@safetrust.local', displayName: 'E2E Guest' },
  { role: 'host', email: 'host@safetrust.local', displayName: 'E2E Host' },
  { role: 'admin', email: 'admin@safetrust.local', displayName: 'E2E Admin' },
] as const;

const walletEnvKeys = {
  guest: 'E2E_GUEST_SECRET',
  host: 'E2E_HOST_SECRET',
  platform: 'E2E_PLATFORM_SECRET',
} as const;

const cliFlags = new Set(process.argv.slice(2));
const checkMode = cliFlags.has('--check');
const generateMode = cliFlags.has('--generate');

for (const envPath of [
  envLocalPath,
  path.join(repoRoot, '.env'),
  path.join(repoRoot, 'apps/api/.env'),
]) {
  if (fs.existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false });
  }
}

function formatPublicKey(publicKey: string): string {
  if (!publicKey) return '(unset)';
  return `${publicKey.slice(0, 8)}...${publicKey.slice(-6)}`;
}

function writeEnvFile(filePath: string, entries: Record<string, string>): void {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = existing.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#'));
  const map = new Map<string, string>();

  for (const line of lines) {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      map.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(entries)) {
    map.set(key, value);
  }

  const nextLines = [...map.entries()].map(([key, value]) => `${key}=${value}`);
  fs.writeFileSync(filePath, `${nextLines.join('\n')}\n`, 'utf8');
}

function ensureGeneratedSecrets(): void {
  const fileEntries: Record<string, string> = {};

  for (const [role, envKey] of Object.entries(walletEnvKeys)) {
    const current = process.env[envKey]?.trim();
    if (current) {
      process.env[envKey] = current;
      continue;
    }

    if (!generateMode) {
      throw new Error(`Missing ${envKey}. Set it in .env.testnet.local or rerun with --generate.`);
    }

    const secret = Keypair.random().secret();
    const publicKey = Keypair.fromSecret(secret).publicKey();
    process.env[envKey] = secret;
    fileEntries[envKey] = secret;
    console.log(`[testnet] generated ${role} wallet ${formatPublicKey(publicKey)} (secret stored in .env.testnet.local)`);
  }

  if (generateMode && Object.keys(fileEntries).length > 0) {
    writeEnvFile(envLocalPath, fileEntries);
  }
}

function assertTestnetConfiguration(): void {
  const networkPassphrase = (process.env.STELLAR_NETWORK_PASSPHRASE ?? defaultNetworkPassphrase).trim();
  const horizonUrl = (process.env.STELLAR_HORIZON_URL ?? defaultHorizonUrl).trim();

  if (networkPassphrase !== defaultNetworkPassphrase) {
    throw new Error(
      `Refusing to run against non-testnet Stellar configuration: STELLAR_NETWORK_PASSPHRASE=${networkPassphrase}`,
    );
  }

  if (!horizonUrl.includes('testnet')) {
    throw new Error(`Refusing to run against non-testnet Horizon endpoint: ${horizonUrl}`);
  }

  process.env.STELLAR_NETWORK_PASSPHRASE = networkPassphrase;
  process.env.STELLAR_HORIZON_URL = horizonUrl;
}

async function friendbotFund(publicKey: string, server: Horizon.Server): Promise<void> {
  try {
    await server.friendbot(publicKey).call();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('404') && !message.includes('already exists')) {
      throw new Error(`Friendbot funding failed for ${formatPublicKey(publicKey)}: ${message}`);
    }
  }
}

async function ensureAccountReady(publicKey: string, secret: string, server: Horizon.Server): Promise<Horizon.AccountResponse> {
  let account: Horizon.AccountResponse;

  try {
    account = await server.loadAccount(publicKey);
  } catch (error: unknown) {
    const status = typeof error === 'object' && error && 'status' in error ? Number((error as { status?: number }).status) : 0;
    if (status !== 404) {
      throw error;
    }

    await friendbotFund(publicKey, server);
    account = await server.loadAccount(publicKey);
  }

  const nativeBalance = Number(
    account.balances.find((balance) => balance.asset_type === 'native')?.balance ?? '0',
  );

  if (nativeBalance < minTestnetXlm) {
    await friendbotFund(publicKey, server);
    account = await server.loadAccount(publicKey);
  }

  if (Number(account.balances.find((balance) => balance.asset_type === 'native')?.balance ?? '0') < minTestnetXlm) {
    throw new Error(`Account ${formatPublicKey(publicKey)} still below ${minTestnetXlm} XLM after funding.`);
  }

  if (!secret || secret === 'undefined') {
    throw new Error(`Secret for ${formatPublicKey(publicKey)} is missing.`);
  }

  return account;
}

async function ensureTrustline(publicKey: string, secret: string, server: Horizon.Server, issuer: string): Promise<void> {
  const account = await ensureAccountReady(publicKey, secret, server);
  const asset = new Asset(testAssetCode, issuer);
  const hasTrustline = account.balances.some(
    (balance) => balance.asset_code === testAssetCode && balance.asset_issuer === issuer,
  );

  if (hasTrustline) {
    return;
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE ?? defaultNetworkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset, source: publicKey }))
    .setTimeout(60)
    .build();

  tx.sign(Keypair.fromSecret(secret));
  await server.submitTransaction(tx);
  console.log(`[testnet] trustline created for ${formatPublicKey(publicKey)} -> ${testAssetCode}@${issuer}`);
}

async function ensureTestAssetBalance(publicKey: string, secret: string, server: Horizon.Server, issuer: string): Promise<void> {
  const account = await ensureAccountReady(publicKey, secret, server);
  const assetBalance = Number(
    account.balances.find((balance) => balance.asset_code === testAssetCode && balance.asset_issuer === issuer)?.balance ?? '0',
  );

  if (assetBalance >= minAssetBalance) {
    return;
  }

  throw new Error(
    `Guest wallet ${formatPublicKey(publicKey)} is missing the ${testAssetCode} balance required for testnet flows (needs >= ${minAssetBalance}).`,
  );
}

function parseBearerTokenResponse(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/^Bearer\s+/i, '').trim();
}

async function hasuraRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const url = process.env.HASURA_GRAPHQL_URL;
  const secret = process.env.HASURA_ADMIN_SECRET;

  if (!url || !secret) {
    throw new Error('Missing REQUIRED env vars: HASURA_GRAPHQL_URL or HASURA_ADMIN_SECRET');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': secret,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Hasura request failed with HTTP ${response.status}: ${response.statusText}`);
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  return (json.data ?? ({} as T));
}

async function ensureUserProfile(userId: string, email: string, firstName: string, lastName: string): Promise<void> {
  const mutation = `
    mutation UpsertUser(
      $id: String!
      $email: String!
      $first_name: String!
      $last_name: String!
    ) {
      insert_users_one(
        object: {
          id: $id
          email: $email
          first_name: $first_name
          last_name: $last_name
          phone_number: ""
          country_code: "CR"
          location: "Testnet bootstrap"
        }
        on_conflict: {
          constraint: users_pkey
          update_columns: [email, first_name, last_name, phone_number, country_code, location, last_seen]
        }
      ) {
        id
        email
      }
    }
  `;

  await hasuraRequest(mutation, {
    id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
  });
}

async function ensureUserRole(userId: string, role: string): Promise<void> {
  const query = `
    query GetRoleId($roleName: String!) {
      roles(where: { name: { _eq: $roleName } }, limit: 1) {
        id
      }
    }
  `;

  const roleData = await hasuraRequest<{ roles: Array<{ id: number }> }>(query, { roleName: role });
  const roleId = roleData.roles[0]?.id;

  if (roleId === undefined) {
    throw new Error(`Role '${role}' is not configured in the SafeTrust database.`);
  }

  const mutation = `
    mutation AssignRole($userId: String!, $roleId: Int!) {
      insert_user_roles_one(
        object: { user_id: $userId, role_id: $roleId }
        on_conflict: {
          constraint: user_roles_user_id_role_id_key
          update_columns: []
        }
      ) {
        id
      }
    }
  `;

  await hasuraRequest(mutation, { userId, roleId });
}

async function ensureUserWallet(userId: string, publicKey: string, provider: string, isPrimary: boolean): Promise<void> {
  const mutation = `
    mutation SyncWallet(
      $userId: String!
      $walletAddress: String!
      $chainType: String!
      $isPrimary: Boolean!
      $provider: String
    ) {
      update_user_wallets(
        where: { user_id: { _eq: $userId }, is_primary: { _eq: true } }
        _set: { is_primary: false }
      ) @include(if: $isPrimary) {
        affected_rows
      }
      insert_user_wallets_one(
        object: {
          user_id: $userId
          wallet_address: $walletAddress
          chain_type: $chainType
          is_primary: $isPrimary
          provider: $provider
        }
        on_conflict: {
          constraint: unique_wallet_address
          update_columns: [user_id, chain_type, is_primary, provider]
        }
      ) {
        id
      }
    }
  `;

  await hasuraRequest(mutation, {
    userId,
    walletAddress: publicKey,
    chainType: 'STELLAR',
    isPrimary,
    provider,
  });
}

async function setupFirebaseUsers(): Promise<Record<string, string>> {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'demo-safetrust';
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? process.env.FIREBASE_EMULATOR_HOST;

  if (getApps().length === 0) {
    if (emulatorHost) {
      initializeApp({ projectId });
    } else {
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      if (!clientEmail || !privateKey || !projectId) {
        throw new Error('Missing Firebase Admin config. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY, or use the Auth emulator.');
      }

      initializeApp({
        credential: cert({ projectId, clientEmail, private_key: privateKey }),
        projectId,
      });
    }
  }

  const auth = getAuth();
  const password = process.env.E2E_TEST_PASSWORD ?? 'Password123!';
  const userIds: Record<string, string> = {};

  for (const template of userTemplates) {
    const uid = `${template.role}-testnet-user`;
    const email = template.email;

    try {
      const existing = await auth.getUserByEmail(email);
      userIds[template.role] = existing.uid;
      await auth.updateUser(existing.uid, {
        emailVerified: true,
        displayName: template.displayName,
      });
      await auth.setCustomUserClaims(existing.uid, { safetrustRole: template.role });
    } catch (error: unknown) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
      if (code !== 'auth/user-not-found') {
        throw error;
      }

      const created = await auth.createUser({
        uid,
        email,
        emailVerified: true,
        password,
        displayName: template.displayName,
      });
      userIds[template.role] = created.uid;
      await auth.setCustomUserClaims(created.uid, { safetrustRole: template.role });
    }

    console.log(`[testnet] firebase user ready: ${email} (${template.role})`);
  }

  return userIds;
}

async function seedPersistentUsers(userIds: Record<string, string>): Promise<void> {
  const legalRoles = { guest: 'guest', host: 'host', admin: 'admin' } as const;

  for (const [role, userId] of Object.entries(userIds)) {
    const normalizedRole = legalRoles[role as keyof typeof legalRoles];
    await ensureUserProfile(userId, `${role}@safetrust.local`, role.charAt(0).toUpperCase() + role.slice(1), 'Testnet');
    await ensureUserRole(userId, normalizedRole);
  }
}

async function ensureApartmentForHost(hostUserId: string, hostWallet: string): Promise<string> {
  const query = `
    query FindApartment($ownerId: String!) {
      apartments(where: { owner_id: { _eq: $ownerId } }, limit: 20) {
        id
        name
      }
    }
  `;

  const result = await hasuraRequest<{ apartments: Array<{ id: string; name: string }> }>(query, { ownerId: hostUserId });
  const existing = result.apartments.find((apartment) => apartment.name === 'Testnet Demo Apartment');
  if (existing) {
    return existing.id;
  }

  const mutation = `
    mutation CreateApartment(
      $ownerId: String!
      $name: String!
      $description: String!
      $price: Int!
      $warrantyDeposit: Int!
      $address: jsonb!
      $availableFrom: timestamp!
    ) {
      insert_apartments_one(
        object: {
          owner_id: $ownerId
          name: $name
          description: $description
          price: $price
          warranty_deposit: $warrantyDeposit
          address: $address
          is_available: true
          available_from: $availableFrom
          image_urls: ["https://example.com/testnet-demo.jpg"]
        }
      ) {
        id
      }
    }
  `;

  const data = await hasuraRequest<{ insert_apartments_one: { id: string } }>(mutation, {
    ownerId: hostUserId,
    name: 'Testnet Demo Apartment',
    description: 'Demo apartment created by the isolated testnet provisioner.',
    price: 1200,
    warrantyDeposit: 300,
    address: {
      line1: 'Testnet Lane 1',
      city: 'San José',
      country: 'CR',
      ownerWallet: hostWallet,
    },
    availableFrom: new Date().toISOString(),
  });

  return data.insert_apartments_one.id;
}

async function validateProvisioning(checkOnly: boolean): Promise<void> {
  const issues: string[] = [];
  const server = new Horizon.Server(process.env.STELLAR_HORIZON_URL ?? defaultHorizonUrl);
  const guestSecret = process.env.E2E_GUEST_SECRET;
  const hostSecret = process.env.E2E_HOST_SECRET;
  const platformSecret = process.env.E2E_PLATFORM_SECRET;
  const platformAddress = process.env.PLATFORM_STELLAR_ADDRESS;
  const usdcIssuer = process.env.USDC_TRUSTLINE_ADDRESS;

  if (!guestSecret || !hostSecret || !platformSecret) {
    issues.push('Missing one or more E2E_*_SECRET keys.');
  }

  if (!platformAddress || !usdcIssuer) {
    issues.push('Missing PLATFORM_STELLAR_ADDRESS or USDC_TRUSTLINE_ADDRESS.');
  }

  if (!process.env.HASURA_GRAPHQL_URL || !process.env.HASURA_ADMIN_SECRET) {
    issues.push('Missing Hasura admin config.');
  }

  if (guestSecret) {
    const guestKeypair = Keypair.fromSecret(guestSecret);
    const guestPublic = guestKeypair.publicKey();
    try {
      const guestAccount = await ensureAccountReady(guestPublic, guestSecret, server);
      const guestNative = Number(guestAccount.balances.find((b) => b.asset_type === 'native')?.balance ?? '0');
      if (guestNative < minTestnetXlm) issues.push(`Guest XLM balance below ${minTestnetXlm}.`);
      if (usdcIssuer) {
        const guestAsset = guestAccount.balances.find((b) => b.asset_code === testAssetCode && b.asset_issuer === usdcIssuer);
        if (!guestAsset || Number(guestAsset.balance) < minAssetBalance) {
          issues.push(`Guest wallet does not have a ${testAssetCode} trustline or enough balance.`);
        }
      }
    } catch (error) {
      issues.push(`Guest account validation failed: ${(error as Error).message}`);
    }
  }

  if (hostSecret) {
    const hostKeypair = Keypair.fromSecret(hostSecret);
    const hostPublic = hostKeypair.publicKey();
    try {
      const hostAccount = await ensureAccountReady(hostPublic, hostSecret, server);
      if (!hostAccount.balances.some((b) => b.asset_code === testAssetCode && b.asset_issuer === usdcIssuer)) {
        issues.push('Host wallet missing the USDC trustline.');
      }
    } catch (error) {
      issues.push(`Host account validation failed: ${(error as Error).message}`);
    }
  }

  if (platformSecret) {
    const platformKeypair = Keypair.fromSecret(platformSecret);
    const platformPublic = platformKeypair.publicKey();
    try {
      const platformAccount = await ensureAccountReady(platformPublic, platformSecret, server);
      if (!platformAccount.balances.some((b) => b.asset_code === testAssetCode && b.asset_issuer === usdcIssuer)) {
        issues.push('Platform wallet missing the USDC trustline.');
      }
    } catch (error) {
      issues.push(`Platform account validation failed: ${(error as Error).message}`);
    }
  }

  if (checkOnly) {
    if (issues.length > 0) {
      console.error('[testnet] check failed:');
      for (const issue of issues) {
        console.error(`- ${issue}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log('[testnet] ok: testnet identities, accounts, trustlines, and wallet links are provisioned.');
    return;
  }

  if (issues.length > 0) {
    console.error('[testnet] provisioning could not proceed with the current testnet state:');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    throw new Error('Provisioning aborted because one or more testnet prerequisites are missing.');
  }
}

async function main(): Promise<void> {
  ensureGeneratedSecrets();
  assertTestnetConfiguration();

  if (!checkMode) {
    const server = new Horizon.Server(process.env.STELLAR_HORIZON_URL ?? defaultHorizonUrl);
    const guestSecret = process.env.E2E_GUEST_SECRET!;
    const hostSecret = process.env.E2E_HOST_SECRET!;
    const platformSecret = process.env.E2E_PLATFORM_SECRET!;
    const issuer = process.env.USDC_TRUSTLINE_ADDRESS!;

    await ensureAccountReady(Keypair.fromSecret(guestSecret).publicKey(), guestSecret, server);
    await ensureAccountReady(Keypair.fromSecret(hostSecret).publicKey(), hostSecret, server);
    await ensureAccountReady(Keypair.fromSecret(platformSecret).publicKey(), platformSecret, server);
    await ensureTrustline(Keypair.fromSecret(guestSecret).publicKey(), guestSecret, server, issuer);
    await ensureTrustline(Keypair.fromSecret(hostSecret).publicKey(), hostSecret, server, issuer);
    await ensureTrustline(Keypair.fromSecret(platformSecret).publicKey(), platformSecret, server, issuer);
    await ensureTestAssetBalance(Keypair.fromSecret(guestSecret).publicKey(), guestSecret, server, issuer);

    const firebaseUsers = await setupFirebaseUsers();
    await seedPersistentUsers(firebaseUsers);

    const guestAddress = Keypair.fromSecret(guestSecret).publicKey();
    const hostAddress = Keypair.fromSecret(hostSecret).publicKey();
    const platformAddress = Keypair.fromSecret(platformSecret).publicKey();

    await ensureUserWallet(firebaseUsers.guest, guestAddress, 'testnet-provisioner', true);
    await ensureUserWallet(firebaseUsers.host, hostAddress, 'testnet-provisioner', true);
    await ensureUserWallet(firebaseUsers.admin, platformAddress, 'testnet-provisioner', false);

    const apartmentId = await ensureApartmentForHost(firebaseUsers.host, hostAddress);

    const summary = [
      `guest: ${formatPublicKey(guestAddress)} | uid=${firebaseUsers.guest}`,
      `host: ${formatPublicKey(hostAddress)} | uid=${firebaseUsers.host}`,
      `platform: ${formatPublicKey(platformAddress)} | uid=${firebaseUsers.admin}`,
      `apartment: ${apartmentId}`,
    ];

    console.log('[testnet] provisioned successfully');
    for (const entry of summary) {
      console.log(entry);
    }
    return;
  }

  await validateProvisioning(true);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[testnet] failed: ${message}`);
  process.exitCode = 1;
});
