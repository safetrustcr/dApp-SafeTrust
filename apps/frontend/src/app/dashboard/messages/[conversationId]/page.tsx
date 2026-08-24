'use client';

import { useQuery } from '@apollo/client';
import { useAuthUser } from '@/components/auth/hooks/auth.hook';
import { GET_CONVERSATIONS } from '@/graphql/queries/messages-queries';
import { ConversationThread } from '@/components/messages/ConversationThread';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ConversationThreadPage({ 
  params 
}: { 
  params: { conversationId: string } 
}) {
  const { user } = useAuthUser();

  // We fetch conversations to get the apartment details and other party info
  const { data, loading } = useQuery(GET_CONVERSATIONS, {
    variables: { userId: user?.uid ?? '' },
    skip: !user?.uid,
  });

  const conversation = data?.conversations?.find(
    (c: any) => c.id === params.conversationId
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground animate-pulse">Loading thread...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center p-8 flex-col gap-4">
        <p className="text-muted-foreground">Conversation not found.</p>
        <Link href="/dashboard/messages" className="text-primary hover:underline">
          Return to Inbox
        </Link>
      </div>
    );
  }

  const isHost = conversation.host.id === user?.uid;
  const otherParty = isHost ? conversation.guest : conversation.host;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto w-full bg-background border-x">
      <div className="p-4 border-b flex items-center gap-4 sticky top-0 bg-background z-10">
        <Link 
          href="/dashboard/messages" 
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="font-semibold">{otherParty.first_name} {otherParty.last_name}</h2>
          <p className="text-xs text-muted-foreground">{conversation.apartment.name}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ConversationThread 
          conversationId={params.conversationId} 
          apartmentId={conversation.apartment.id} 
        />
      </div>
    </div>
  );
}
