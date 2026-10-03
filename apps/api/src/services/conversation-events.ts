import { hasuraRequest } from './hasura.js';

export type EscrowLifecycleEvent = {
  event_type:
    | 'escrow_created'
    | 'escrow_funded'
    | 'milestone_completed'
    | 'milestone_approved'
    | 'funds_released'
    | 'dispute_opened'
    | 'dispute_resolved';
  body: string;
  event_key: string;
};

type LifecycleContext = {
  contractId: string;
  action: string;
  toStatus: string;
  fromStatus?: string;
  txHash?: string | null;
  apartmentName?: string | null;
  amount?: string | number | null;
  asset?: string | null;
};

export function buildEventKey(contractId: string, eventType: EscrowLifecycleEvent['event_type']): string {
  return `escrow:${contractId}:${eventType}`;
}

export function buildLifecycleEvent(context: LifecycleContext): EscrowLifecycleEvent | null {
  let event_type: EscrowLifecycleEvent['event_type'];
  let body: string;

  if (context.toStatus === 'created' || context.action === 'initialize') {
    event_type = 'escrow_created';
    body = `Escrow created for ${context.apartmentName || 'the apartment'}. Waiting for the deposit.`;
  } else if (context.action === 'mark_milestone_completed') {
    event_type = 'milestone_completed';
    body = 'The host marked the stay as completed. Guest: review and approve.';
  } else if (context.action === 'approve_milestone' || context.toStatus === 'milestone_approved') {
    event_type = 'milestone_approved';
    body = 'The guest approved the milestone. The deposit can now be released.';
  } else if (context.action === 'release_funds' || (context.toStatus === 'completed' && context.fromStatus === 'milestone_approved')) {
    event_type = 'funds_released';
    body = 'The deposit was released to the host.';
  } else if (context.action === 'dispute' || context.toStatus === 'disputed') {
    event_type = 'dispute_opened';
    body = 'A dispute was opened. The platform will review it.';
  } else if (context.action === 'resolve_dispute' || context.toStatus === 'resolved') {
    event_type = 'dispute_resolved';
    body = 'The dispute was resolved.';
  } else if (context.action === 'fund' || context.toStatus === 'funded') {
    event_type = 'escrow_funded';
    body = `Deposit of ${context.amount ?? 'the confirmed amount'} ${context.asset || 'USDC'} is locked in escrow on Stellar Testnet.`;
  } else {
    return null;
  }

  const explorer = context.txHash?.trim()
    ? `\nhttps://stellar.expert/explorer/testnet/tx/${context.txHash.trim()}`
    : '';
  return { event_type, body: `${body}${explorer}`, event_key: buildEventKey(context.contractId, event_type) };
}

type ApartmentParticipants = {
  apartments: { id: string; name: string; owner_id: string }[];
  user_wallets: { user_id: string }[];
};

/** Reuses a host/guest thread and links it to the escrow. */
export async function ensureEscrowConversation(params: {
  apartmentId: string;
  senderAddress: string;
  escrowId: string;
}): Promise<{ id: string; apartmentName: string } | null> {
  const participants = await hasuraRequest<ApartmentParticipants>(
    `query EscrowConversationParticipants($apartmentId: uuid!, $walletAddress: String!) {
      apartments(where: { id: { _eq: $apartmentId } }, limit: 1) { id name owner_id }
      user_wallets(where: { wallet_address: { _eq: $walletAddress } }, limit: 1) { user_id }
    }`,
    { apartmentId: params.apartmentId, walletAddress: params.senderAddress },
  );
  const apartment = participants.apartments[0];
  const guestId = participants.user_wallets[0]?.user_id;
  if (!apartment || !guestId) {
    console.warn(`[escrow/events] skipped conversation link: apartment or registered guest wallet missing for escrow ${params.escrowId}`);
    return null;
  }

  const data = await hasuraRequest<{
    insert_conversations_one: { id: string } | null;
  }>(
    `mutation UpsertEscrowConversation($object: conversations_insert_input!) {
      insert_conversations_one(
        object: $object
        on_conflict: { constraint: conversations_unique_pair, update_columns: [escrow_id] }
      ) { id }
    }`,
    {
      object: {
        apartment_id: apartment.id,
        host_id: apartment.owner_id,
        guest_id: guestId,
        escrow_id: params.escrowId,
        status: 'active',
        tenant_id: 'safetrust',
      },
    },
  );

  if (!data.insert_conversations_one) return null;
  return { id: data.insert_conversations_one.id, apartmentName: apartment.name };
}

export async function getEscrowConversationId(contractId: string): Promise<string | null> {
  const data = await hasuraRequest<{ escrows: { id: string }[] }>(
    `query EscrowIdForConversation($contractId: String!) {
      escrows(where: { contract_id: { _eq: $contractId } }, limit: 1) { id }
    }`,
    { contractId },
  );
  const escrowId = data.escrows[0]?.id;
  if (!escrowId) {
    console.warn(`[escrow/events] skipped lifecycle event: escrow record missing for ${contractId}`);
    return null;
  }
  const conversations = await hasuraRequest<{ conversations: { id: string }[] }>(
    `query ConversationForEscrow($escrowId: uuid!) {
      conversations(where: { escrow_id: { _eq: $escrowId } }, limit: 1) { id }
    }`,
    { escrowId },
  );
  const conversationId = conversations.conversations[0]?.id;
  if (!conversationId) {
    console.warn(`[escrow/events] skipped lifecycle event: no conversation linked to escrow ${contractId}`);
    return null;
  }
  return conversationId;
}

export async function prepareEscrowLifecycleMessage(contextInput: LifecycleContext): Promise<{
  conversationId: string;
  event: EscrowLifecycleEvent;
} | null> {
  let context = contextInput;
  if (!buildLifecycleEvent(context)) return null;

  if (context.action === 'initialize' || context.toStatus === 'created') {
    const data = await hasuraRequest<{
      escrows: { id: string; apartment_id: string | null; sender_address: string | null; amount: string | number; apartment: { name: string } | null }[];
    }>(
      `query EscrowForCreatedEvent($contractId: String!) {
        escrows(where: { contract_id: { _eq: $contractId } }, limit: 1) {
          id apartment_id sender_address amount apartment { name }
        }
      }`,
      { contractId: context.contractId },
    );
    const escrow = data.escrows[0];
    if (escrow) context = { ...context, amount: context.amount ?? escrow.amount, apartmentName: escrow.apartment?.name ?? context.apartmentName };
    if (escrow?.apartment_id && escrow.sender_address) {
      const conversation = await ensureEscrowConversation({
        apartmentId: escrow.apartment_id,
        senderAddress: escrow.sender_address,
        escrowId: escrow.id,
      });
      if (conversation) {
        const created = buildLifecycleEvent(context);
        if (created) return { conversationId: conversation.id, event: created };
      }
    }
    console.warn(`[escrow/events] skipped created event: conversation could not be linked for ${context.contractId}`);
    return null;
  }

  const [conversationId, escrowData, trustlessData] = await Promise.all([
    getEscrowConversationId(context.contractId),
    hasuraRequest<{ escrows: { amount: string | number }[] }>(
      `query EscrowEventAmount($contractId: String!) {
        escrows(where: { contract_id: { _eq: $contractId } }, limit: 1) { amount }
      }`,
      { contractId: context.contractId },
    ),
    hasuraRequest<{ trustlessWorkEscrows: { assetCode: string }[] }>(
      `query EscrowEventAsset($contractId: String!) {
        trustlessWorkEscrows(where: { contractId: { _eq: $contractId } }, limit: 1) { assetCode }
      }`,
      { contractId: context.contractId },
    ),
  ]);
  context = {
    ...context,
    amount: context.amount ?? escrowData.escrows[0]?.amount,
    asset: context.asset ?? trustlessData.trustlessWorkEscrows[0]?.assetCode,
  };
  const event = buildLifecycleEvent(context);
  return conversationId && event ? { conversationId, event } : null;
}

export function messageMutationFields(): string {
  return `insert_messages_one(
    object: $message
    on_conflict: { constraint: messages_conversation_event_key, update_columns: [] }
  ) { id }`;
}

export function messageMutationVariable(): string {
  return '$message: messages_insert_input!';
}

export function lifecycleMessageInput(
  conversationId: string,
  event: EscrowLifecycleEvent,
): Record<string, unknown> {
  return {
    conversation_id: conversationId,
    sender_id: 'safetrust-system',
    is_automated: true,
    event_type: event.event_type,
    event_key: event.event_key,
    body: event.body,
    tenant_id: 'safetrust',
  };
}
