'use client';

import { useQuery } from '@apollo/client';
import { useAuthUser } from '@/components/auth/hooks/auth.hook';
import { GET_CONVERSATIONS } from '@/graphql/queries/messages-queries';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageSquare } from 'lucide-react';

export default function MessagesInboxPage() {
  const { user } = useAuthUser();

  const { data, loading, error } = useQuery(GET_CONVERSATIONS, {
    variables: { userId: user?.uid ?? '' },
    skip: !user?.uid,
    fetchPolicy: 'cache-and-network',
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground animate-pulse">Loading conversations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-destructive">Failed to load conversations.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto w-full bg-background border-x">
      <div className="p-4 border-b flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Messages</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <ConversationList 
          conversations={data?.conversations ?? []} 
          currentUserId={user?.uid ?? ''} 
        />
      </div>
    </div>
  );
}
