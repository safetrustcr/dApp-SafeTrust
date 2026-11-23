'use client';

import React, { useState } from 'react';

export const DISPUTE_REASONS = [
  'Property not as described',
  'Host unreachable',
  'Cancellation / early checkout',
  'Check-in issues',
  'Damage / deposit dispute',
  'Other',
] as const;

export type OpenDisputeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { reason: string; description: string }) => Promise<void> | void;
  isLoading?: boolean;
  loadingMessage?: string;
  escrowAmount?: number | null;
};

export function OpenDisputeModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  loadingMessage = 'Submitting dispute...',
  escrowAmount,
}: OpenDisputeModalProps) {
  const [step, setStep] = useState<'form' | 'confirm'>('form');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [acknowledged, setAcknowledged] = useState<boolean>(false);

  if (!isOpen) return null;

  const finalReason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
  const isFormValid = Boolean(finalReason && selectedReason && (selectedReason !== 'Other' || customReason.trim().length > 0));

  const handleResetAndClose = () => {
    if (isLoading) return;
    setStep('form');
    setSelectedReason('');
    setCustomReason('');
    setDescription('');
    setAcknowledged(false);
    onClose();
  };

  const handleConfirmSubmit = async () => {
    if (!isFormValid || !acknowledged || isLoading) return;
    await onSubmit({
      reason: finalReason,
      description: description.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispute-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          maxWidth: '32rem',
          width: '100%',
          padding: '1.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 id="dispute-modal-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
            {step === 'form' ? 'Open an Escrow Dispute' : 'Confirm Dispute Submission'}
          </h2>
          <button
            type="button"
            onClick={handleResetAndClose}
            disabled={isLoading}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              color: '#9ca3af',
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        {step === 'form' ? (
          <div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#4b5563', lineHeight: 1.5 }}>
              Raise a dispute to protect your funds. Escrow funds will remain locked on-chain until the platform reviews the case and issues a resolution split.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="dispute-reason-select"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}
              >
                Dispute Reason <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                id="dispute-reason-select"
                aria-label="Dispute Reason"
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  outline: 'none',
                }}
              >
                <option value="">Select a reason...</option>
                {DISPUTE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {selectedReason === 'Other' && (
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="custom-dispute-reason"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}
                >
                  Specify Reason <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="custom-dispute-reason"
                  type="text"
                  placeholder="Enter specific reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label
                  htmlFor="dispute-description-input"
                  style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}
                >
                  Description (Optional)
                </label>
                <span
                  id="dispute-char-counter"
                  style={{
                    fontSize: '0.8rem',
                    color: description.length > 450 ? '#dc2626' : '#6b7280',
                  }}
                >
                  {description.length} / 500
                </span>
              </div>
              <textarea
                id="dispute-description-input"
                aria-label="Dispute Description"
                placeholder="Provide details about the issue (up to 500 characters)..."
                maxLength={500}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleResetAndClose}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!isFormValid}
                onClick={() => setStep('confirm')}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: isFormValid ? '#dc2626' : '#fca5a5',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                }}
              >
                Continue to Review
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontSize: '0.95rem', fontWeight: 600 }}>
                Important Notice: Escrow Lock
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#7f1d1d', lineHeight: 1.45 }}>
                Opening a dispute will freeze this escrow. The funds
                {escrowAmount ? ` ($${escrowAmount.toLocaleString()} USDC)` : ''} will remain locked in the Trustless Work smart contract until the SafeTrust dispute resolver issues a final resolution split.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                  Reason
                </span>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
                  {finalReason}
                </p>
              </div>

              {description.trim() && (
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>
                    Details
                  </span>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.875rem', color: '#374151', whiteSpace: 'pre-wrap' }}>
                    {description.trim()}
                  </p>
                </div>
              )}
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
                marginBottom: '1.5rem',
                cursor: 'pointer',
              }}
            >
              <input
                id="dispute-acknowledge-checkbox"
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                style={{ marginTop: '0.2rem' }}
              />
              <span style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.4 }}>
                I understand that funds stay locked in escrow until the platform resolves the dispute.
              </span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => setStep('form')}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Back
              </button>
              <button
                type="button"
                id="confirm-dispute-submit-button"
                disabled={!acknowledged || isLoading}
                onClick={handleConfirmSubmit}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: acknowledged && !isLoading ? '#dc2626' : '#fca5a5',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: acknowledged && !isLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {isLoading ? loadingMessage : 'Confirm & Open Dispute'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
