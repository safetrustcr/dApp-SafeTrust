import { describe, it, expect } from 'vitest';

describe('Escrow Dispute Role Permissions', () => {
  function getDisputePermissions(params: {
    status: string;
    isApprover: boolean;
    isMarker: boolean;
    isResolver: boolean;
  }) {
    const canDispute = params.status === 'funded' || params.status === 'milestone_approved';
    const canResolve = params.status === 'disputed';
    const showDisputeButton = canDispute && (params.isApprover || params.isMarker) && !params.isResolver;
    const showResolveButton = canResolve && params.isResolver;

    return { showDisputeButton, showResolveButton };
  }

  it('allows guest (approver) to see Open Dispute when funded or milestone_approved', () => {
    expect(
      getDisputePermissions({ status: 'funded', isApprover: true, isMarker: false, isResolver: false })
        .showDisputeButton,
    ).toBe(true);
    expect(
      getDisputePermissions({
        status: 'milestone_approved',
        isApprover: true,
        isMarker: false,
        isResolver: false,
      }).showDisputeButton,
    ).toBe(true);
    expect(
      getDisputePermissions({ status: 'created', isApprover: true, isMarker: false, isResolver: false })
        .showDisputeButton,
    ).toBe(false);
  });

  it('allows host (marker) to see Open Dispute when funded or milestone_approved', () => {
    expect(
      getDisputePermissions({ status: 'funded', isApprover: false, isMarker: true, isResolver: false })
        .showDisputeButton,
    ).toBe(true);
    expect(
      getDisputePermissions({
        status: 'milestone_approved',
        isApprover: false,
        isMarker: true,
        isResolver: false,
      }).showDisputeButton,
    ).toBe(true);
    expect(
      getDisputePermissions({ status: 'created', isApprover: false, isMarker: true, isResolver: false })
        .showDisputeButton,
    ).toBe(false);
  });

  it('ensures the platform wallet (resolver) NEVER sees Open Dispute even if marked or approving', () => {
    expect(
      getDisputePermissions({ status: 'funded', isApprover: false, isMarker: false, isResolver: true })
        .showDisputeButton,
    ).toBe(false);
    expect(
      getDisputePermissions({ status: 'funded', isApprover: true, isMarker: false, isResolver: true })
        .showDisputeButton,
    ).toBe(false);
    expect(
      getDisputePermissions({ status: 'funded', isApprover: false, isMarker: true, isResolver: true })
        .showDisputeButton,
    ).toBe(false);
    expect(
      getDisputePermissions({
        status: 'milestone_approved',
        isApprover: true,
        isMarker: false,
        isResolver: true,
      }).showDisputeButton,
    ).toBe(false);
  });

  it('allows platform wallet (resolver) to see Resolve button only when disputed', () => {
    expect(
      getDisputePermissions({ status: 'disputed', isApprover: false, isMarker: false, isResolver: true })
        .showResolveButton,
    ).toBe(true);
    expect(
      getDisputePermissions({ status: 'funded', isApprover: false, isMarker: false, isResolver: true })
        .showResolveButton,
    ).toBe(false);
    expect(
      getDisputePermissions({ status: 'disputed', isApprover: true, isMarker: false, isResolver: false })
        .showResolveButton,
    ).toBe(false);
  });
});
