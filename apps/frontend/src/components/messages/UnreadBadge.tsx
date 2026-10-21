"use client";

import { useSubscription, gql } from "@apollo/client";

const SUBSCRIBE_UNREAD_COUNT = gql`
  subscription UnreadCount($userId: String!) {
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
      aggregate {
        count
      }
    }
  }
`;

export function UnreadBadge({ userId }: { userId?: string }) {
  const { data } = useSubscription(SUBSCRIBE_UNREAD_COUNT, {
    variables: { userId },
    skip: !userId,
  });

  const count = data?.messages_aggregate?.aggregate?.count ?? 0;

  if (count === 0) return null;

  return (
    <div className="absolute right-2 bg-blue-500 text-white rounded-full min-w-[18px] h-4.5 flex items-center justify-center text-[10px] font-bold px-1 dark:bg-blue-600">
      {count > 9 ? "9+" : count}
    </div>
  );
}
