export type ListingRoute = { kind: 'apartment' | 'hotel'; id: string };

function withQuery(path: string, query?: URLSearchParams): string {
  const serialized = query?.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export const routes = {
  home: () => '/',
  rent: (query?: URLSearchParams) => withQuery('/rent', query),
  listing: (listing: ListingRoute) => `/${listing.kind}/${listing.id}`,
  bookApartment: (id: string) => `/apartment/${id}/escrow/create`,
  bookHotel: (id: string) => `/hotel/${id}/escrow/create`,
  suggestions: (query?: URLSearchParams) =>
    withQuery('/dashboard/guest/suggestions', query),
  conversation: (id: string) => `/dashboard/messages/${id}`,
  login: (next?: string) =>
    next ? withQuery('/login', new URLSearchParams({ next })) : '/login',
};

export function safeNextPath(next: string | undefined): string {
  return next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : '/dashboard';
}
