import { hasuraRequest, isUniqueViolation } from './hasura.js';

export type ApartmentRecord = {
  id: string;
  owner_id: string;
};

export type ConversationRecord = {
  id: string;
  apartment_id: string;
  host_id: string;
  guest_id: string;
  host_last_read_at?: string | null;
  guest_last_read_at?: string | null;
  last_message_at?: string | null;
};

export type MessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  is_automated: boolean;
  event_type: string | null;
  created_at: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: unknown): id is string {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export async function getApartment(apartmentId: string): Promise<ApartmentRecord | null> {
  if (!isValidUuid(apartmentId)) {
    return null;
  }

  const data = await hasuraRequest<{ apartments: ApartmentRecord[] }>(
    `query GetApartment($apartmentId: uuid!) {
      apartments(where: { id: { _eq: $apartmentId } }, limit: 1) {
        id
        owner_id
      }
    }`,
    { apartmentId },
  );

  return data.apartments?.[0] ?? null;
}

export async function getConversation(conversationId: string): Promise<ConversationRecord | null> {
  if (!isValidUuid(conversationId)) {
    return null;
  }

  const data = await hasuraRequest<{ conversations: ConversationRecord[] }>(
    `query GetConversation($conversationId: uuid!) {
      conversations(where: { id: { _eq: $conversationId } }, limit: 1) {
        id
        apartment_id
        host_id
        guest_id
        host_last_read_at
        guest_last_read_at
        last_message_at
      }
    }`,
    { conversationId },
  );

  return data.conversations?.[0] ?? null;
}

export async function getConversationByPair(
  apartmentId: string,
  guestId: string,
): Promise<ConversationRecord | null> {
  if (!isValidUuid(apartmentId)) {
    return null;
  }

  const data = await hasuraRequest<{ conversations: ConversationRecord[] }>(
    `query GetConversationByPair($apartmentId: uuid!, $guestId: String!) {
      conversations(
        where: {
          apartment_id: { _eq: $apartmentId }
          guest_id: { _eq: $guestId }
        }
        limit: 1
      ) {
        id
        apartment_id
        host_id
        guest_id
        host_last_read_at
        guest_last_read_at
        last_message_at
      }
    }`,
    { apartmentId, guestId },
  );

  return data.conversations?.[0] ?? null;
}

export async function upsertConversation(params: {
  apartmentId: string;
  hostId: string;
  guestId: string;
}): Promise<{ conversationId: string; created: boolean }> {
  const { apartmentId, hostId, guestId } = params;

  try {
    const data = await hasuraRequest<{
      insert_conversations_one: { id: string } | null;
    }>(
      `mutation UpsertConversation($apartmentId: uuid!, $hostId: String!, $guestId: String!) {
        insert_conversations_one(
          object: {
            apartment_id: $apartmentId
            host_id: $hostId
            guest_id: $guestId
          }
          on_conflict: {
            constraint: conversations_unique_pair
            update_columns: []
          }
        ) {
          id
        }
      }`,
      { apartmentId, hostId, guestId },
    );

    if (data.insert_conversations_one?.id) {
      return {
        conversationId: data.insert_conversations_one.id,
        created: true,
      };
    }
  } catch (error) {
    if (!isUniqueViolation(error)) {
      throw error;
    }
  }

  // Already exists: fetch the existing conversation
  const existing = await getConversationByPair(apartmentId, guestId);
  if (!existing) {
    throw new Error('Failed to resolve conversation after unique constraint conflict');
  }

  return {
    conversationId: existing.id,
    created: false,
  };
}

export async function insertManualMessage(params: {
  conversationId: string;
  senderId: string;
  body: string;
  readerRole: 'host' | 'guest';
}): Promise<MessageRecord> {
  const { conversationId, senderId, body, readerRole } = params;
  const now = new Date().toISOString();

  if (readerRole === 'host') {
    const data = await hasuraRequest<{
      insert_messages_one: MessageRecord;
      update_conversations?: { affected_rows: number };
    }>(
      `mutation InsertHostMessage(
        $conversationId: uuid!
        $senderId: String!
        $body: String!
        $now: timestamptz!
      ) {
        insert_messages_one(
          object: {
            conversation_id: $conversationId
            sender_id: $senderId
            body: $body
            is_automated: false
          }
        ) {
          id
          conversation_id
          sender_id
          body
          is_automated
          event_type
          created_at
        }
        update_conversations(
          where: { id: { _eq: $conversationId } }
          _set: {
            host_last_read_at: $now
            last_message_at: $now
          }
        ) {
          affected_rows
        }
      }`,
      { conversationId, senderId, body, now },
    );
    return data.insert_messages_one;
  } else {
    const data = await hasuraRequest<{
      insert_messages_one: MessageRecord;
      update_conversations?: { affected_rows: number };
    }>(
      `mutation InsertGuestMessage(
        $conversationId: uuid!
        $senderId: String!
        $body: String!
        $now: timestamptz!
      ) {
        insert_messages_one(
          object: {
            conversation_id: $conversationId
            sender_id: $senderId
            body: $body
            is_automated: false
          }
        ) {
          id
          conversation_id
          sender_id
          body
          is_automated
          event_type
          created_at
        }
        update_conversations(
          where: { id: { _eq: $conversationId } }
          _set: {
            guest_last_read_at: $now
            last_message_at: $now
          }
        ) {
          affected_rows
        }
      }`,
      { conversationId, senderId, body, now },
    );
    return data.insert_messages_one;
  }
}

export async function markConversationRead(params: {
  conversationId: string;
  readerRole: 'host' | 'guest';
}): Promise<void> {
  const { conversationId, readerRole } = params;
  const now = new Date().toISOString();

  if (readerRole === 'host') {
    await hasuraRequest(
      `mutation MarkHostConversationRead($conversationId: uuid!, $now: timestamptz!) {
        update_conversations(
          where: { id: { _eq: $conversationId } }
          _set: { host_last_read_at: $now }
        ) {
          affected_rows
        }
      }`,
      { conversationId, now },
    );
  } else {
    await hasuraRequest(
      `mutation MarkGuestConversationRead($conversationId: uuid!, $now: timestamptz!) {
        update_conversations(
          where: { id: { _eq: $conversationId } }
          _set: { guest_last_read_at: $now }
        ) {
          affected_rows
        }
      }`,
      { conversationId, now },
    );
  }
}
