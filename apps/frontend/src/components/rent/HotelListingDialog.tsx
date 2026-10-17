"use client";
import type { PublicRentalProperty } from '@safetrust/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image } from '@/components/ui/image';

export function HotelListingDialog({ hotel, onClose }: { hotel: PublicRentalProperty | null; onClose: () => void }) {
  return <Dialog open={Boolean(hotel)} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{hotel?.name}</DialogTitle><DialogDescription>{hotel?.address}</DialogDescription></DialogHeader>
    <p className="text-sm text-muted-foreground">{hotel?.description}</p>
    <div className="grid grid-cols-2 gap-3">{hotel?.images.map((src, index) => <Image key={index} src={src} alt={`${hotel.name} photo ${index + 1}`} width={320} height={220} className="h-40 w-full rounded-lg object-cover" />)}</div>
    <h2 className="font-semibold">Rooms</h2>
    {!hotel?.rooms?.length && <p className="text-sm text-muted-foreground">No rooms have been registered for this hotel yet.</p>}
    {hotel?.rooms?.map((room) => <article key={room.id} className="rounded-lg border p-4"><h3 className="font-medium">Room {room.number}</h3><p className="text-sm text-muted-foreground">${room.price.toLocaleString()} per night · {room.capacity} guests · {room.available ? 'Available' : 'Unavailable'}</p><div className="mt-2 grid grid-cols-3 gap-2">{room.images.map((src, index) => <Image key={index} src={src} alt={`Room ${room.number} photo ${index + 1}`} width={180} height={120} className="h-24 w-full rounded-md object-cover" />)}</div></article>)}
    {!!hotel?.rooms?.length && <p className="text-xs text-muted-foreground">A saved reservation is required before starting a hotel escrow payment.</p>}
  </DialogContent></Dialog>;
}
