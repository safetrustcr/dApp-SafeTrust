'use client';

import { useQuery } from '@apollo/client';
import { GET_UNREAD_COUNT } from '@/graphql/queries/messages-queries';

export function UnreadBadge({ userId }: { userId?: string }) {
  const { data } = useQuery(GET_UNREAD_COUNT, {
    variables: { userId },
    pollInterval: 30_000,
    skip: !userId,
  });

  const count = data?.messages_aggregate?.aggregate?.count ?? 0;

  if (count === 0) return null;

  return (
    <div className="absolute right-2 bg-blue-500 text-white rounded-full min-w-[18px] h-4.5 flex items-center justify-center text-[10px] font-bold px-1 dark:bg-blue-600">
      {count > 99 ? '99+' : count}
    </div>
  );
}
