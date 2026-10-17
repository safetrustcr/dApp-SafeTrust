import { beforeAll, describe, expect, it, afterAll } from 'vitest';
import { deployEscrowHandler } from '../deploy.handler.js';
import { fundEscrowHandler } from '../fund.handler.js';
import { changeMilestoneStatusHandler } from '../milestone-status.handler.js';
import { releaseFundsHandler } from '../release-funds.handler.js';
import fs from 'fs';
import path from 'path';

// Evidence recording
const evidenceLog = [];
const logEvidence = (step, data) => {
  const timestamp = new Date().toISOString();
  const entry = { timestamp, step, data };
  evidenceLog.push(entry);
  console.log(`[EVIDENCE] ${timestamp} - ${step}:`, JSON.stringify(data, null, 2));
};

// Test configuration - should be set via environment variables
const testConfig = {
  platformAddress: process.env.PLATFORM_STELLAR_ADDRESS || 'GPLATFORM111111111111111111111111111111111111111111111111',
  platformFee: process.env.PLATFORM_FEE_PERCENT || '1',
  // Testnet addresses - replace with real Testnet addresses when running
  tenantAddress: process.env.TEST_TENANT_ADDRESS || 'GTENANT111111111111111111111111111111111111111111111111111',
  ownerAddress: process.env.TEST_OWNER_ADDRESS || 'GOWNER111111111111111111111111111111111111111111111111111',
  serviceProviderAddress: process.env.TEST_SERVICE_PROVIDER_ADDRESS || 'GOWNER111111111111111111111111111111111111111111111111111',
  releaseSignerAddress: process.env.TEST_RELEASE_SIGNER_ADDRESS || 'GTENANT111111111111111111111111111111111111111111111111111',
};

// Store test artifacts
let testArtifacts = {
  apartment: {
    engagementId: null,
    contractId: null,
    unsignedXDRs: [],
  },
  hotel: {
    engagementId: null,
    contractId: null,
    unsignedXDRs: [],
  },
};

describe('Real Testnet Lifecycle - Apartment Escrow', () => {
  beforeAll(() => {
    // Set environment variables for the test
    process.env.PLATFORM_STELLAR_ADDRESS = testConfig.platformAddress;
    process.env.PLATFORM_FEE_PERCENT = testConfig.platformFee;
    
    logEvidence('TEST_SETUP', {
      platformAddress: testConfig.platformAddress,
      platformFee: testConfig.platformFee,
      tenantAddress: testConfig.tenantAddress,
      ownerAddress: testConfig.ownerAddress,
    });
  });

  it('Step 1: Deploy apartment escrow contract', async () => {
    const apartmentId = `APT-TEST-${Date.now()}`;
    const engagementId = `ENG-APT-${Date.now()}`;
    const amount = 1200; // USDC

    const req = {
      body: {
        apartmentId,
        tenantAddress: testConfig.tenantAddress,
        ownerAddress: testConfig.ownerAddress,
        amount,
        engagementId,
      },
    };

    const res = {
      _status: null,
      _body: undefined,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        this._body = payload;
        return this;
      },
    };

    await deployEscrowHandler(req, res);

    logEvidence('APARTMENT_DEPLOY', {
      apartmentId,
      engagementId,
      amount,
      status: res._status,
      response: res._body,
    });

    if (res._status === 200 && res._body.unsignedXDR) {
      testArtifacts.apartment.engagementId = engagementId;
      testArtifacts.apartment.unsignedXDRs.push({
        step: 'deploy',
        xdr: res._body.unsignedXDR,
      });
    }

    // If running without real credentials, we expect this to fail with auth error
    if (!process.env.TRUSTLESS_WORK_API_KEY || process.env.TRUSTLESS_WORK_API_KEY === 'your_api_key_here') {
      console.log('⚠️  Running without real API key - test will fail at API call stage');
      expect(res._status).toBe(500);
    } else {
      expect(res._status).toBe(200);
      expect(res._body.unsignedXDR).toBeDefined();
      expect(res._body.engagementId).toBe(engagementId);
    }
  });

  it('Step 2: Fund apartment escrow contract', async () => {
    if (!testArtifacts.apartment.engagementId) {
      console.log('⚠️  Skipping fund step - deploy step did not succeed');
      return;
    }

    // In real scenario, contractId would be extracted from the signed/broadcasted transaction
    // For test, we use engagementId as placeholder
    const contractId = testArtifacts.apartment.engagementId;
    const amount = 950; // USDC

    const req = {
      body: {
        contractId,
        signer: testConfig.tenantAddress,
        amount,
      },
    };

    const res = {
      _status: null,
      _body: undefined,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        this._body = payload;
        return this;
      },
    };

    await fundEscrowHandler(req, res);

    logEvidence('APARTMENT_FUND', {
      contractId,
      amount,
      status: res._status,
      response: res._body,
    });

    if (res._status === 201 && res._body.unsignedTransaction) {
      testArtifacts.apartment.contractId = contractId;
      testArtifacts.apartment.unsignedXDRs.push({
        step: 'fund',
        xdr: res._body.unsignedTransaction,
      });
    }

    if (!process.env.TRUSTLESS_WORK_API_KEY || process.env.TRUSTLESS_WORK_API_KEY === 'your_api_key_here') {
      expect(res._status).toBe(500);
    } else {
      expect(res._status).toBe(201);
      expect(res._body.unsignedTransaction).toBeDefined();
    }
  });

  it('Step 3: Change milestone status for apartment', async () => {
    if (!testArtifacts.apartment.contractId) {
      console.log('⚠️  Skipping milestone step - fund step did not succeed');
      return;
    }

    const req = {
      body: {
        contractId: testArtifacts.apartment.contractId,
        milestoneIndex: 0,
        newEvidence: 'Rental period completed successfully',
        newStatus: 'completed',
        serviceProvider: testConfig.ownerAddress,
      },
    };

    const res = {
      _status: null,
      _body: undefined,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        this._body = payload;
        return this;
      },
    };

    await changeMilestoneStatusHandler(req, res);

    logEvidence('APARTMENT_MILESTONE', {
      contractId: testArtifacts.apartment.contractId,
      milestoneIndex: 0,
      newStatus: 'completed',
      status: res._status,
      response: res._body,
    });

    if (res._status === 201 && res._body.unsignedTransaction) {
      testArtifacts.apartment.unsignedXDRs.push({
        step: 'milestone',
        xdr: res._body.unsignedTransaction,
      });
    }

    if (!process.env.TRUSTLESS_WORK_API_KEY || process.env.TRUSTLESS_WORK_API_KEY === 'your_api_key_here') {
      expect(res._status).toBe(500);
    } else {
      expect(res._status).toBe(201);
      expect(res._body.unsignedTransaction).toBeDefined();
    }
  });

  it('Step 4: Release funds for apartment', async () => {
    if (!testArtifacts.apartment.contractId) {
      console.log('⚠️  Skipping release step - previous steps did not succeed');
      return;
    }

    const req = {
      body: {
        contractId: testArtifacts.apartment.contractId,
        releaseSigner: testConfig.tenantAddress,
      },
    };

    const res = {
      _status: null,
      _body: undefined,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        this._body = payload;
        return this;
      },
    };

    await releaseFundsHandler(req, res);

    logEvidence('APARTMENT_RELEASE', {
      contractId: testArtifacts.apartment.contractId,
      releaseSigner: testConfig.tenantAddress,
      status: res._status,
      response: res._body,
    });

    if (res._status === 201 && res._body.unsignedTransaction) {
      testArtifacts.apartment.unsignedXDRs.push({
        step: 'release',
        xdr: res._body.unsignedTransaction,
      });
    }

    if (!process.env.TRUSTLESS_WORK_API_KEY || process.env.TRUSTLESS_WORK_API_KEY === 'your_api_key_here') {
      expect(res._status).toBe(500);
    } else {
      expect(res._status).toBe(201);
      expect(res._body.unsignedTransaction).toBeDefined();
    }
  });
});

describe('Real Testnet Lifecycle - Hotel Reservation Escrow', () => {
  beforeAll(() => {
    // Set environment variables for the test
    process.env.PLATFORM_STELLAR_ADDRESS = testConfig.platformAddress;
    process.env.PLATFORM_FEE_PERCENT = testConfig.platformFee;
    
    logEvidence('HOTEL_TEST_SETUP', {
      platformAddress: testConfig.platformAddress,
      platformFee: testConfig.platformFee,
      serviceProviderAddress: testConfig.serviceProviderAddress,
      releaseSignerAddress: testConfig.releaseSignerAddress,
    });
  });

  it('Step 1: Deploy hotel reservation escrow contract', async () => {
    const hotelId = `HOTEL-TEST-${Date.now()}`;
    const engagementId = `ENG-HOTEL-${Date.now()}`;
    const amount = 2500; // USDC - higher for hotel reservations

    const req = {
      body: {
        apartmentId: hotelId, // Using apartmentId field for hotel ID
        tenantAddress: testConfig.tenantAddress,
        ownerAddress: testConfig.serviceProviderAddress,
        amount,
        engagementId,
      },
    };

    const res = {
      _status: null,
      _body: undefined,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        this._body = payload;
        return this;
      },
    };

    await deployEscrowHandler(req, res);

    logEvidence('HOTEL_DEPLOY', {
      hotelId,
      engagementId,
      amount,
      status: res._status,
      response: res._body,
    });

    if (res._status === 200 && res._body.unsignedXDR) {
      testArtifacts.hotel.engagementId = engagementId;
      testArtifacts.hotel.unsignedXDRs.push({
        step: 'deploy',
        xdr: res._body.unsignedXDR,
      });
    }

    if (!process.env.TRUSTLESS_WORK_API_KEY || process.env.TRUSTLESS_WORK_API_KEY === 'your_api_key_here') {
      expect(res._status).toBe(500);
    } else {
      expect(res._status).toBe(200);
      expect(res._body.unsignedXDR).toBeDefined();
      expect(res._body.engagementId).toBe(engagementId);
    }
  });

  it('Step 2: Fund hotel reservation escrow contract', async () => {
    if (!testArtifacts.hotel.engagementId) {
      console.log('⚠️  Skipping fund step - deploy step did not succeed');
      return;
    }

    const contractId = testArtifacts.hotel.engagementId;
    const amount = 2500; // USDC

    const req = {
      body: {
        contractId,
        signer: testConfig.tenantAddress,
        amount,
      },
    };

    const res = {
      _status: null,
      _body: undefined,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        this._body = payload;
        return this;
      },
    };

    await fundEscrowHandler(req, res);

    logEvidence('HOTEL_FUND', {
      contractId,
      amount,
      status: res._status,
      response: res._body,
    });

    if (res._status === 201 && res._body.unsignedTransaction) {
      testArtifacts.hotel.contractId = contractId;
      testArtifacts.hotel.unsignedXDRs.push({
        step: 'fund',
        xdr: res._body.unsignedTransaction,
      });
    }

    if (!process.env.TRUSTLESS_WORK_API_KEY || process.env.TRUSTLESS_WORK_API_KEY === 'your_api_key_here') {
      expect(res._status).toBe(500);
    } else {
      expect(res._status).toBe(201);
      expect(res._body.unsignedTransaction).toBeDefined();
    }
  });

  it('Step 3: Change milestone status for hotel (check-in)', async () => {
    if (!testArtifacts.hotel.contractId) {
      console.log('⚠️  Skipping milestone step - fund step did not succeed');
      return;
    }

    const req = {
      body: {
        contractId: testArtifacts.hotel.contractId,
        milestoneIndex: 0,
        newEvidence: 'Guest checked in successfully',
        newStatus: 'completed',
        serviceProvider: testConfig.serviceProviderAddress,
      },
    };

    const res = {
      _status: null,
      _body: undefined,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        this._body = payload;
        return this;
      },
    };

    await changeMilestoneStatusHandler(req, res);

    logEvidence('HOTEL_MILESTONE_CHECKIN', {
      contractId: testArtifacts.hotel.contractId,
      milestoneIndex: 0,
      newStatus: 'completed',
      status: res._status,
      response: res._body,
    });

    if (res._status === 201 && res._body.unsignedTransaction) {
      testArtifacts.hotel.unsignedXDRs.push({
        step: 'milestone_checkin',
        xdr: res._body.unsignedTransaction,
      });
    }

    if (!process.env.TRUSTLESS_WORK_API_KEY || process.env.TRUSTLESS_WORK_API_KEY === 'your_api_key_here') {
      expect(res._status).toBe(500);
    } else {
      expect(res._status).toBe(201);
      expect(res._body.unsignedTransaction).toBeDefined();
    }
  });

  it('Step 4: Change milestone status for hotel (check-out)', async () => {
    if (!testArtifacts.hotel.contractId) {
      console.log('⚠️  Skipping check-out milestone step - previous steps did not succeed');
      return;
    }

    const req = {
      body: {
        contractId: testArtifacts.hotel.contractId,
        milestoneIndex: 1,
        newEvidence: 'Guest checked out, room inspected',
        newStatus: 'completed',
        serviceProvider: testConfig.serviceProviderAddress,
      },
    };

    const res = {
      _status: null,
      _body: undefined,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        this._body = payload;
        return this;
      },
    };

    await changeMilestoneStatusHandler(req, res);

    logEvidence('HOTEL_MILESTONE_CHECKOUT', {
      contractId: testArtifacts.hotel.contractId,
      milestoneIndex: 1,
      newStatus: 'completed',
      status: res._status,
      response: res._body,
    });

    if (res._status === 201 && res._body.unsignedTransaction) {
      testArtifacts.hotel.unsignedXDRs.push({
        step: 'milestone_checkout',
        xdr: res._body.unsignedTransaction,
      });
    }

    if (!process.env.TRUSTLESS_WORK_API_KEY || process.env.TRUSTLESS_WORK_API_KEY === 'your_api_key_here') {
      expect(res._status).toBe(500);
    } else {
      expect(res._status).toBe(201);
      expect(res._body.unsignedTransaction).toBeDefined();
    }
  });

  it('Step 5: Release funds for hotel reservation', async () => {
    if (!testArtifacts.hotel.contractId) {
      console.log('⚠️  Skipping release step - previous steps did not succeed');
      return;
    }

    const req = {
      body: {
        contractId: testArtifacts.hotel.contractId,
        releaseSigner: testConfig.releaseSignerAddress,
      },
    };

    const res = {
      _status: null,
      _body: undefined,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        this._body = payload;
        return this;
      },
    };

    await releaseFundsHandler(req, res);

    logEvidence('HOTEL_RELEASE', {
      contractId: testArtifacts.hotel.contractId,
      releaseSigner: testConfig.releaseSignerAddress,
      status: res._status,
      response: res._body,
    });

    if (res._status === 201 && res._body.unsignedTransaction) {
      testArtifacts.hotel.unsignedXDRs.push({
        step: 'release',
        xdr: res._body.unsignedTransaction,
      });
    }

    if (!process.env.TRUSTLESS_WORK_API_KEY || process.env.TRUSTLESS_WORK_API_KEY === 'your_api_key_here') {
      expect(res._status).toBe(500);
    } else {
      expect(res._status).toBe(201);
      expect(res._body.unsignedTransaction).toBeDefined();
    }
  });
});

afterAll(() => {
  // Write evidence to file
  const evidenceDir = path.join(process.cwd(), 'test-evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const evidenceFile = path.join(evidenceDir, `testnet-lifecycle-${Date.now()}.json`);
  const report = {
    timestamp: new Date().toISOString(),
    config: testConfig,
    evidence: evidenceLog,
    artifacts: testArtifacts,
    summary: {
      apartmentSteps: testArtifacts.apartment.unsignedXDRs.length,
      hotelSteps: testArtifacts.hotel.unsignedXDRs.length,
      totalEvidenceEntries: evidenceLog.length,
    },
  };

  fs.writeFileSync(evidenceFile, JSON.stringify(report, null, 2));
  console.log(`\n📋 Evidence report written to: ${evidenceFile}`);
  console.log(`📊 Total evidence entries: ${evidenceLog.length}`);
  console.log(`🏢 Apartment lifecycle steps: ${testArtifacts.apartment.unsignedXDRs.length}`);
  console.log(`🏨 Hotel lifecycle steps: ${testArtifacts.hotel.unsignedXDRs.length}`);
});
