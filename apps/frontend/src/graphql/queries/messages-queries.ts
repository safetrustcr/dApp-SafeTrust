import { gql } from '@apollo/client';

export const GET_CONVERSATIONS = gql`
  query GetConversations($userId: String!) {
    conversations(
      where: {
        _or: [
          { host_id: { _eq: $userId } }
          { guest_id: { _eq: $userId } }
        ]
      }
      order_by: { last_message_at: desc_nulls_last }
    ) {
      id status last_message_at
      apartment { id name image_urls address }
      host { id first_name last_name email }
      guest { id first_name last_name email }
      messages(limit: 1, order_by: { created_at: desc }) {
        id body is_automated created_at
        sender { first_name }
      }
    }
  }
`;

export const SUBSCRIBE_CONVERSATION_MESSAGES = gql`
  subscription SubscribeMessages($conversationId: uuid!) {
    messages(
      where: { conversation_id: { _eq: $conversationId } }
      order_by: { created_at: asc }
    ) {
      id body is_automated event_type read_at created_at
      sender { id first_name last_name email }
    }
  }
`;

export const GET_UNREAD_COUNT = gql`
  query GetUnreadCount($userId: String!) {
    messages_aggregate(
      where: {
        read_at: { _is_null: true }
        conversation: {
          _or: [
            { host_id: { _eq: $userId } }
            { guest_id: { _eq: $userId } }
          ]
        }
        sender_id: { _neq: $userId }
      }
    ) {
      aggregate { count }
    }
  }
`;

export const MARK_MESSAGES_READ = gql`
  mutation MarkMessagesRead($conversationId: uuid!, $userId: String!) {
    update_messages(
      where: {
        conversation_id: { _eq: $conversationId }
        sender_id: { _neq: $userId }
        read_at: { _is_null: true }
      }
      _set: { read_at: "now()" }
    ) { affected_rows }
  }
`;
