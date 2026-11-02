'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthUser } from '@/components/auth/hooks/auth.hook';
import { startConversation } from '@/lib/api/messages';
import { routes } from '@/lib/routes';

export function MessageHostButton({
  apartmentId,
  hostId,
}: {
  apartmentId: string;
  hostId: string;
}) {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [isMessaging, setIsMessaging] = useState(false);

  if (!loading && user?.uid === hostId) return null;

  const handleClick = async () => {
    if (!user) {
      router.push(routes.login(routes.listing({ kind: 'apartment', id: apartmentId })));
      return;
    }

    setIsMessaging(true);
    try {
      const conversation = await startConversation(apartmentId);
      router.push(routes.conversation(conversation.conversationId));
    } catch (cause) {
      console.error('Failed to start conversation:', cause);
      toast.error('Failed to start conversation', {
        description: 'Please try again.',
      });
    } finally {
      setIsMessaging(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || isMessaging}
      className="mt-3 w-full rounded-xl border-2 border-orange-600 px-5 py-3 font-semibold text-orange-700 transition hover:bg-orange-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 dark:text-orange-300 dark:hover:text-white"
    >
      {isMessaging ? 'Starting conversation…' : 'Message host'}
    </button>
  );
}
