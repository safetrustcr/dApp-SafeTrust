"use client";

import { useMutation, useApolloClient, gql } from "@apollo/client";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useState, useEffect } from "react";

const START_CONVERSATION = gql`
  mutation StartConversation($apartmentId: uuid!, $hostId: String!, $guestId: String!) {
    insert_conversations_one(
      object: {
        apartment_id: $apartmentId,
        host_id: $hostId,
        guest_id: $guestId
      }
    ) {
      id
    }
  }
`;

const GET_EXISTING_CONVERSATION = gql`
  query GetExistingConversation($apartmentId: uuid!, $guestId: String!) {
    conversations(
      where: {
        apartment_id: { _eq: $apartmentId },
        guest_id: { _eq: $guestId }
      }
      limit: 1
    ) {
      id
    }
  }
`;

export function MessageHostButton({ apartmentId, hostId }: { apartmentId: string, hostId: string }) {
  const router = useRouter();
  const client = useApolloClient();
  const [startConversation] = useMutation(START_CONVERSATION);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    return auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
  }, []);

  const handleClick = async () => {
    if (!auth.currentUser) {
      router.push(`/login?redirect=/apartment/${apartmentId}`);
      return;
    }
    const guestId = auth.currentUser.uid;
    if (guestId === hostId) return;

    setLoading(true);
    try {
      const { data: existingData } = await client.query({
        query: GET_EXISTING_CONVERSATION,
        variables: { apartmentId, guestId },
        fetchPolicy: "network-only"
      });

      if (existingData?.conversations?.length > 0) {
        router.push(`/dashboard/messages/${existingData.conversations[0].id}`);
        return;
      }

      const { data } = await startConversation({
        variables: {
          apartmentId,
          hostId,
          guestId
        }
      });
      if (data?.insert_conversations_one?.id) {
        router.push(`/dashboard/messages/${data.insert_conversations_one.id}`);
      }
    } catch (e: any) {
      console.error(e);
      alert("Failed to start conversation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (userId && userId === hostId) {
    return null;
  }

  return (
    <button 
      onClick={handleClick}
      disabled={loading}
      style={{
        display: "inline-flex",
        backgroundColor: "#f97316",
        color: "#ffffff",
        fontWeight: 700,
        padding: "0.75rem 1.5rem",
        borderRadius: "0.75rem",
        marginTop: "1rem",
        cursor: "pointer",
        border: "none",
        width: "100%"
      }}
    >
      {loading ? "Starting..." : "Message Host"}
    </button>
  );
}
