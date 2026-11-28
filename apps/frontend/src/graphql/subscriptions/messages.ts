import { gql } from "@apollo/client";

export const INBOX_SUBSCRIPTION = gql`
  subscription Inbox {
    conversations(order_by: { last_message_at: desc_nulls_last }) {
      id
      unread_count
      last_message_at
      escrow_id
      apartment {
        id
        name
      }
      host {
        id
        display_name
      }
      guest {
        id
        display_name
      }
      messages(limit: 1, order_by: { created_at: desc }) {
        id
        body
        is_automated
        created_at
      }
    }
  }
`;

export const THREAD_SUBSCRIPTION = gql`
  subscription Thread($conversationId: uuid!) {
    messages(
      where: { conversation_id: { _eq: $conversationId } }
      order_by: { created_at: asc }
    ) {
      id
      body
      is_automated
      created_at
      sender_id
      conversation_id
    }
  }
`;
