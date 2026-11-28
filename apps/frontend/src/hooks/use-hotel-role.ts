"use client";

import { useEffect, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { hotelRoleFromClaims, type HotelHasuraRole } from "@/lib/hotel-access";

export type HotelRoleState = { role: HotelHasuraRole | null; loading: boolean };

/**
 * The hotel role this user may request, read from the signed ID token's Hasura
 * claims. Updates whenever Firebase refreshes the token (e.g. after the server
 * grants hotel_manager and the client calls getIdToken(true)).
 */
export function useHotelRole(): HotelRoleState {
  const [state, setState] = useState<HotelRoleState>({ role: null, loading: true });

  useEffect(() => {
    return onIdTokenChanged(auth, async (user) => {
      if (!user) {
        setState({ role: null, loading: false });
        return;
      }
      try {
        const token = await user.getIdTokenResult();
        setState({ role: hotelRoleFromClaims(token.claims), loading: false });
      } catch {
        setState({ role: null, loading: false });
      }
    });
  }, []);

  return state;
}