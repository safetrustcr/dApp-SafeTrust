"use client";

import Link from "next/link";
import { useQuery } from "@apollo/client";
import {
  Bath, BedDouble, Heart, MapPin, PawPrint,
  Loader2, Search, Bell, ChevronDown, User,
} from "lucide-react";
import { GET_ALL_APARTMENTS } from "@/graphql/queries/apartment-queries";
import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { auth } from "@/lib/firebase";

interface Apartment {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  warranty_deposit: number;
  is_available: boolean;
  image_urls?: string[] | null;
  address: {
    street?: string;
    neighborhood?: string;
    city?: string;
    country?: string;
  };
  owner_id: string;
}

const FALLBACK_IMAGES = [
  "/img/room1.png",
  "/img/room2.png",
  "/img/hotel/hotel1.jpg",
];

function formatAddress(address: Apartment["address"]): string {
  if (!address) return "San José, Costa Rica";
  return [address.street, address.neighborhood, address.city]
    .filter(Boolean)
    .join(", ") || "San José, Costa Rica";
}

function getImage(apt: Apartment, fallbackIndex = 0): string {
  return apt.image_urls?.[0] || FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length];
}

export default function GuestDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useGlobalAuthenticationStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [promoting, setPromoting] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set by middleware when a guest is bounced off a host-only route
  const wasBlocked = searchParams.get("blocked") === "true";

  async function handleSwitchToHost() {
    setPromoting(true);
    setPromoteError(null);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setPromoteError("You need to be signed in to become a host");
        return;
      }

      // Force token refresh — stored token may be expired
      const idToken = await currentUser.getIdToken(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";

      const res = await fetch(`${apiUrl}/api/auth/promote-to-host`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Promotion failed");
      }

      // Clear role cookie so middleware re-fetches updated role on next request
      document.cookie = "user-role=; Max-Age=0; path=/";

      // Full page navigation — forces middleware role check with fresh cookie
      window.location.href = "/dashboard/escrow-dashboard";

    } catch (err) {
      setPromoteError(
        err instanceof Error ? err.message : "Failed to switch to host view"
      );
    } finally {
      setPromoting(false);
    }
  }

  // Decode display name from stored token for avatar initials
  const userName = (() => {
    if (!token) return "Account";
    try {
      const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64));
      return payload.name || payload.email?.split("@")[0] || "Account";
    } catch {
      return "Account";
    }
  })();

  const initials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const { data, loading, error } = useQuery(GET_ALL_APARTMENTS, {
    variables: { limit: 10, offset: 0 },
  });

  const apartments: Apartment[] = data?.apartments ?? [];
  const featured = apartments[0] ?? null;
  const suggestions = apartments.slice(0, 5);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/logo.png" alt="SafeTrust" className="h-8 w-8" />
            <span className="font-bold text-lg text-gray-900">SafeTrust</span>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-xl hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
            <button
              type="button"
              className="flex items-center gap-1 text-sm font-medium text-gray-700 border-r border-gray-300 pr-3 mr-1"
            >
              Rent <ChevronDown className="h-3 w-3" />
            </button>
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="City, province or neighborhood"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">

            {/* Switch to Host */}
            <button
              type="button"
              onClick={handleSwitchToHost}
              disabled={promoting}
              className="hidden md:flex items-center gap-1.5 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {promoting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {promoting ? "Switching…" : "Switch to Host view"}
            </button>

            {/* Bell */}
            <button
              type="button"
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Bell className="h-5 w-5 text-gray-600" />
            </button>

            {/* Avatar + dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                onClick={() => setAvatarOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  {userName.split(" ")[0]}
                </span>
                <div className="h-7 w-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {initials}
                </div>
              </button>

              {/* Dropdown */}
              {avatarOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white shadow-lg ring-1 ring-black/5 z-50 overflow-hidden">
                  {/* User info */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                      <p className="text-xs text-gray-400">Guest account</p>
                    </div>
                  </div>

                  {/* Profile link */}
                  <button
                    type="button"
                    onClick={() => { setAvatarOpen(false); router.push("/dashboard/profile"); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    My profile
                  </button>

                  {/* Logout — dropdown variant: light style, red text */}
                  <div className="border-t border-gray-100">
                    <LogoutButton variant="dropdown" />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Blocked banner */}
        {wasBlocked && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-orange-800">
              That page is only available to hosts. Switch to a host account to
              list and manage properties.
            </p>
            <button
              type="button"
              onClick={handleSwitchToHost}
              disabled={promoting}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {promoting && <Loader2 className="h-4 w-4 animate-spin" />}
              {promoting ? "Switching…" : "Switch to Host view"}
            </button>
          </div>
        )}

        {/* Promote error */}
        {promoteError && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {promoteError}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="py-12 text-center text-sm text-red-500">
            Failed to load apartments — {error.message}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && apartments.length === 0 && (
          <div className="py-24 text-center space-y-3">
            <p className="text-lg font-semibold text-gray-900">No apartments listed yet</p>
            <p className="text-sm text-gray-500">
              Be the first to{" "}
              <Link
                href="/dashboard/apartments/new"
                className="text-orange-500 hover:underline font-medium"
              >
                list a property
              </Link>
              .
            </p>
          </div>
        )}

        {/* Apartment grid */}
        {!loading && !error && apartments.length > 0 && (
          <div className="grid gap-8 xl:grid-cols-[18rem_1fr]">

            {/* ── Sidebar ── */}
            <aside className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Suggestions</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {data?.apartments_aggregate?.aggregate?.count ?? apartments.length} units available
                </p>
                <Link
                  href="/dashboard/guest/suggestions"
                  className="inline-flex mt-1 text-xs font-medium text-orange-500 hover:text-orange-600 hover:underline underline-offset-2"
                >
                  Browse all →
                </Link>
              </div>

              <div className="space-y-3">
                {suggestions.map((apt, idx) => (
                  <article
                    key={apt.id}
                    className="flex gap-3 rounded-xl border border-gray-100 bg-white shadow-sm p-2.5 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/apartment/${apt.id}`)}
                  >
                    <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImage(apt, idx)}
                        alt={apt.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <h2 className="text-sm font-bold text-gray-900 truncate">{apt.name}</h2>
                        <Heart className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                        {formatAddress(apt.address)}
                      </p>
                      <div className="flex items-center justify-between mt-1.5 text-xs">
                        <span className="text-gray-400">2bd · pet friendly · 1 bathroom</span>
                        <span className="font-bold text-emerald-600">
                          ${apt.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </aside>

            {/* ── Featured ── */}
            {featured && (
              <main className="grid gap-6 lg:grid-cols-[1fr_15rem]">
                <section className="space-y-5">

                  {/* Hero image */}
                  <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-gray-100 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImage(featured)}
                      alt={featured.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_IMAGES[0];
                      }}
                    />
                    <span className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold uppercase text-white shadow">
                      🔥 Promoted
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold text-gray-900">{featured.name}</h2>
                        <p className="flex items-center gap-1.5 text-sm text-gray-500">
                          <MapPin className="h-4 w-4 text-orange-400 shrink-0" />
                          {formatAddress(featured.address)}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-4 w-4 text-orange-400" />2 bd
                          </span>
                          <span className="flex items-center gap-1">
                            <PawPrint className="h-4 w-4 text-orange-400" />pet friendly
                          </span>
                          <span className="flex items-center gap-1">
                            <Bath className="h-4 w-4 text-orange-400" />1 ba
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/apartment/${featured.id}/escrow/create`)
                          }
                          className="rounded-lg bg-orange-500 px-10 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors shadow-sm"
                        >
                          BOOK
                        </button>
                        <p className="text-xl font-bold text-emerald-600">
                          ${featured.price.toLocaleString()}.00{" "}
                          <span className="text-xs font-normal text-gray-400">Per month</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          Deposit: ${featured.warranty_deposit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {featured.description && (
                      <div className="space-y-1.5">
                        <h3 className="text-lg font-bold text-gray-900">Apartment details</h3>
                        <p className="max-w-3xl text-sm leading-6 text-gray-500">
                          {featured.description}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Thumbnail gallery */}
                <aside className="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3 self-start">
                  {(featured.image_urls && featured.image_urls.length > 1
                    ? featured.image_urls.slice(1, 4)
                    : FALLBACK_IMAGES
                  ).map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100 shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${featured.name} ${i + 2}`}
                        className="h-full w-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_IMAGES[i];
                        }}
                      />
                    </div>
                  ))}
                </aside>
              </main>
            )}
          </div>
        )}
      </div>
    </div>
  );
}