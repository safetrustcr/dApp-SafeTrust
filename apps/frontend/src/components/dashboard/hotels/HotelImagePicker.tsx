"use client";
import { useRef, useState } from 'react';
import { Paperclip, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Image } from '@/components/ui/image';
import { prepareImageAttachments } from '@/lib/prepare-image-attachments';

export function HotelImagePicker({ images, onChange, onBusyChange, disabled }: { images: string[]; onChange: (images: string[]) => void; onBusyChange: (busy: boolean) => void; disabled?: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  async function attach(files: FileList | null) {
    if (!files?.length) return;
    setError('');
    setBusy(true); onBusyChange(true);
    try {
      if (images.length + files.length > 8) throw new Error('Choose up to 8 hotel images.');
      const prepared = await prepareImageAttachments(Array.from(files));
      onChange(Array.from(new Set([...images, ...prepared])));
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to attach images.'); }
    finally { setBusy(false); onBusyChange(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  function addUrl() {
    setError('');
    try {
      const parsed = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsed.protocol) || url.trim().length > 2048) throw new Error();
      if (images.length >= 8) { setError('Choose up to 8 hotel images.'); return; }
      if (images.includes(url.trim())) { setError('This image is already attached.'); return; }
      onChange([...images, url.trim()]); setUrl('');
    } catch { setError('Enter a valid HTTP image URL.'); }
  }
  return <section className="space-y-3" aria-label="Hotel images">
    <h2 className="text-sm font-medium">Hotel images</h2>
    <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" aria-label="Attach hotel image files" disabled={disabled || busy} onChange={(event) => void attach(event.target.files)} />
    <Button type="button" variant="outline" className="gap-2" disabled={disabled || busy || images.length >= 8} onClick={() => fileInput.current?.click()}><Paperclip className="h-4 w-4" />{busy ? 'Preparing images…' : 'Attach images'}</Button>
    <p className="text-xs text-muted-foreground">Up to 8 JPEG, PNG, or WebP photos, 10 MB each.</p>
    <div className="flex gap-2"><Input aria-label="Hotel image URL" placeholder="https://example.com/hotel.jpg" value={url} disabled={disabled || busy} onChange={(event) => setUrl(event.target.value)} /><Button type="button" variant="outline" disabled={disabled || busy || images.length >= 8} onClick={addUrl}><Plus className="mr-1 h-4 w-4" />Add URL</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((src, index) => <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-lg border"><Image src={src} alt={`Hotel photo ${index + 1}`} fill sizes="200px" className="object-cover" /><Button type="button" size="icon" variant="secondary" className="absolute right-1 top-1 h-7 w-7" aria-label={`Remove hotel photo ${index + 1}`} disabled={disabled || busy} onClick={() => onChange(images.filter((_, position) => position !== index))}><X className="h-4 w-4" /></Button></div>)}</div>
  </section>;
}
