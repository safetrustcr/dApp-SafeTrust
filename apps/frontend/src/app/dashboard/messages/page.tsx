"use client";

import { useSubscription, useQuery } from "@apollo/client";
import { useAuthUser } from "@/components/auth/hooks/auth.hook";
import { INBOX_SUBSCRIPTION } from "@/graphql/subscriptions/messages";
import { MessageSquare, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function MessagesInboxPage() {
  const { user } = useAuthUser();

  const { data, loading, error } = useSubscription(INBOX_SUBSCRIPTION, {
    skip: !user?.uid,
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-3xl mx-auto w-full">
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center max-w-3xl mx-auto w-full">
        <p className="text-destructive mb-4">We could not load your messages at this time.</p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          <RefreshCcw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const conversations = data?.conversations ?? [];

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8 text-center max-w-3xl mx-auto w-full">
        <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No messages yet</h2>
        <p className="text-muted-foreground mb-6">Contact a host from an apartment page.</p>
        <Link
          href="/rent"
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Explore rentals
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-3xl mx-auto w-full bg-background border-x">
      <div className="p-4 border-b flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-semibold">Messages</h1>
      </div>

      <div className="flex-1 overflow-y-auto divide-y">
        {conversations.map((conv: any) => {
          const isHost = user?.uid === conv.host.id;
          const otherParticipant = isHost ? conv.guest : conv.host;
          const initials = otherParticipant?.display_name
            ? otherParticipant.display_name.substring(0, 2).toUpperCase()
            : "??";
          const lastMessage = conv.messages?.[0];

          return (
            <Link
              key={conv.id}
              href={`/dashboard/messages/${conv.id}`}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-lg flex-shrink-0">
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold truncate">
                    {otherParticipant?.display_name || "Unknown"}
                  </h3>
                  {lastMessage && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {formatDistanceToNow(new Date(lastMessage.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground truncate max-w-[120px] shrink-0">
                    {conv.apartment?.name}
                  </span>
                  <span className="text-muted-foreground/50 mx-1">•</span>
                  <p
                    className={`truncate ${
                      lastMessage?.is_automated
                        ? "italic text-muted-foreground"
                        : "text-foreground/80"
                    }`}
                  >
                    {lastMessage ? lastMessage.body : "No messages yet"}
                  </p>
                </div>
              </div>

              {conv.unread_count > 0 && (
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {conv.unread_count > 9 ? "9+" : conv.unread_count}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
