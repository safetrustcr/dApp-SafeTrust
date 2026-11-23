'use client';

import React, { useState, useId } from 'react';
import { isSplitValid, toStroops, STROOP_FACTOR } from '@/utils/escrow-utils';

export type ResolverViewProps = {
  escrowBalance: number;
  approverAddress?: string | null;
  receiverAddress?: string | null;
  disputeReason?: string | null;
  disputeDescription?: string | null;
  isLoading?: boolean;
  loadingMessage?: string;
  onResolve: (distributions: [
    { role: 'approver'; amount: number },
    { role: 'serviceProvider'; amount: number }
  ]) => Promise<void> | void;
};

export function ResolverView({
  escrowBalance,
  approverAddress,
  receiverAddress,
  disputeReason,
  disputeDescription,
  isLoading = false,
  loadingMessage = 'Resolving dispute...',
  onResolve,
}: ResolverViewProps) {
  const [approverInput, setApproverInput] = useState<string>('0');
  const [receiverInput, setReceiverInput] = useState<string>('0');

  const guestInputId = useId();
  const hostInputId = useId();

  const approverNum = Number.parseFloat(approverInput) || 0;
  const receiverNum = Number.parseFloat(receiverInput) || 0;

  const approverStroops = toStroops(approverInput);
  const receiverStroops = toStroops(receiverInput);
  const totalStroops = toStroops(escrowBalance);
  const allocatedStroops = approverStroops + receiverStroops;
  const remainingStroops = totalStroops - allocatedStroops;

  const remainingBalance = remainingStroops / STROOP_FACTOR;
  const allocatedBalance = allocatedStroops / STROOP_FACTOR;

  const valid = isSplitValid(approverInput, receiverInput, escrowBalance);

  const handleResolveClick = async () => {
    if (!valid || isLoading) return;
    await onResolve([
      { role: 'approver', amount: approverNum },
      { role: 'serviceProvider', amount: receiverNum },
    ]);
  };

  const handleSetQuickSplit = (guestPct: number) => {
    const guestStroops = Math.round((totalStroops * guestPct) / 100);
    const hostStroops = totalStroops - guestStroops;
    setApproverInput((guestStroops / STROOP_FACTOR).toString());
    setReceiverInput((hostStroops / STROOP_FACTOR).toString());
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '1rem',
        padding: '1.5rem',
        display: 'grid',
        gap: '1.5rem',
      }}
    >
      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>
          Dispute Resolution Panel
        </h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#4b5563' }}>
          As the authorized dispute resolver, specify the fund distribution between Guest and Host. The split must match the total on-chain escrow balance exactly.
        </p>
      </div>

      {/* Dispute details displayed to the resolver */}
      <div
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.75rem',
          padding: '1rem',
        }}
      >
        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Dispute Information
        </h4>
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#7f1d1d', fontWeight: 600 }}>Reason: </span>
            <span style={{ fontSize: '0.9rem', color: '#991b1b', fontWeight: 700 }} data-testid="resolver-dispute-reason">
              {disputeReason || 'Dispute opened by participant'}
            </span>
          </div>
          {disputeDescription && (
            <div>
              <span style={{ fontSize: '0.8rem', color: '#7f1d1d', fontWeight: 600 }}>Description: </span>
              <p
                style={{
                  margin: '0.25rem 0 0 0',
                  fontSize: '0.875rem',
                  color: '#450a0a',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#ffffff',
                  padding: '0.6rem',
                  borderRadius: '0.4rem',
                  border: '1px solid #fecaca',
                }}
                data-testid="resolver-dispute-description"
              >
                {disputeDescription}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick split buttons */}
      <div>
        <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
          Quick Distribution Presets
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleSetQuickSplit(100)}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '0.4rem',
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
            }}
          >
            100% Guest / 0% Host
          </button>
          <button
            type="button"
            onClick={() => handleSetQuickSplit(50)}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '0.4rem',
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
            }}
          >
            50% / 50%
          </button>
          <button
            type="button"
            onClick={() => handleSetQuickSplit(0)}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '0.4rem',
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
            }}
          >
            0% Guest / 100% Host
          </button>
        </div>
      </div>

      {/* Split Inputs */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
        }}
      >
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
          }}
        >
          <label htmlFor={guestInputId} style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
            Guest Allocation (Approver)
          </label>
          {approverAddress && (
            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
              {approverAddress.slice(0, 8)}...{approverAddress.slice(-6)}
            </span>
          )}
          <div style={{ position: 'relative' }}>
            <input
              id={guestInputId}
              type="number"
              step="any"
              min={0}
              max={escrowBalance}
              value={approverInput}
              onChange={(e) => setApproverInput(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                fontSize: '1rem',
                fontWeight: 600,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
              USDC
            </span>
          </div>
        </div>

        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '1rem',
            backgroundColor: '#f9fafb',
          }}
        >
          <label htmlFor={hostInputId} style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
            Host Allocation (Service Provider)
          </label>
          {receiverAddress && (
            <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
              {receiverAddress.slice(0, 8)}...{receiverAddress.slice(-6)}
            </span>
          )}
          <div style={{ position: 'relative' }}>
            <input
              id={hostInputId}
              type="number"
              step="any"
              min={0}
              max={escrowBalance}
              value={receiverInput}
              onChange={(e) => setReceiverInput(e.target.value)}
              placeholder="0.00"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                fontSize: '1rem',
                fontWeight: 600,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            <span style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
              USDC
            </span>
          </div>
        </div>
      </div>

      {/* Live totals & balance comparison */}
      <div
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1rem',
          display: 'grid',
          gap: '0.6rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
          <span style={{ color: '#4b5563' }}>Total Escrow Balance:</span>
          <span style={{ fontWeight: 700, color: '#111827' }} data-testid="escrow-balance-total">
            {escrowBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} USDC
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
          <span style={{ color: '#4b5563' }}>Total Allocated:</span>
          <span style={{ fontWeight: 700, color: '#111827' }} data-testid="total-allocated">
            {allocatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} USDC
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
          <span style={{ color: '#4b5563' }}>Remaining Amount:</span>
          <span
            style={{
              fontWeight: 700,
              color: remainingStroops === 0 ? '#16a34a' : remainingStroops > 0 ? '#d97706' : '#dc2626',
            }}
            data-testid="remaining-amount"
          >
            {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })} USDC
          </span>
        </div>

        {/* Validation message */}
        <div
          role="status"
          style={{
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            marginTop: '0.5rem',
            backgroundColor: valid ? '#f0fdf4' : remainingStroops < 0 ? '#fef2f2' : '#fffbeb',
            color: valid ? '#166534' : remainingStroops < 0 ? '#991b1b' : '#92400e',
            border: `1px solid ${valid ? '#bbf7d0' : remainingStroops < 0 ? '#fecaca' : '#fde68a'}`,
          }}
        >
          {valid ? (
            <span>✓ Split is balanced exactly to the escrow balance. Ready to resolve.</span>
          ) : remainingStroops > 0 ? (
            <span>⚠ Submitting is blocked: {remainingBalance.toFixed(7)} USDC remaining to allocate.</span>
          ) : (
            <span>✕ Submitting is blocked: allocation exceeds escrow balance by {Math.abs(remainingBalance).toFixed(7)} USDC.</span>
          )}
        </div>
      </div>

      {/* Action button */}
      <div>
        <button
          type="button"
          id="resolve-dispute-submit-button"
          disabled={!valid || isLoading}
          onClick={handleResolveClick}
          style={{
            width: '100%',
            padding: '0.85rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: valid && !isLoading ? '#dc2626' : '#9ca3af',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: valid && !isLoading ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.15s ease',
          }}
        >
          {isLoading ? loadingMessage : 'Submit Dispute Resolution'}
        </button>
      </div>
    </div>
  );
}
