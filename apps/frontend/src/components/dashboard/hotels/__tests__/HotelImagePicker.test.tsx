// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('@/lib/prepare-image-attachments', () => ({ prepareImageAttachments: vi.fn() }));
vi.mock('@/components/ui/image', () => ({ Image: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
import { prepareImageAttachments } from '@/lib/prepare-image-attachments';
import { HotelImagePicker } from '../HotelImagePicker';
afterEach(cleanup);
describe('hotel images', () => {
  it('prepares file attachments and shows previews that can be removed', async () => {
    vi.mocked(prepareImageAttachments).mockResolvedValue(['data:image/jpeg;base64,YWJj']);
    const change = vi.fn(); const busy = vi.fn();
    const { rerender } = render(<HotelImagePicker images={[]} onChange={change} onBusyChange={busy} />);
    fireEvent.change(screen.getByLabelText('Attach hotel image files'), { target: { files: [new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })] } });
    await waitFor(() => expect(change).toHaveBeenCalledWith(['data:image/jpeg;base64,YWJj']));
    expect(busy).toHaveBeenLastCalledWith(false);
    rerender(<HotelImagePicker images={['data:image/jpeg;base64,YWJj']} onChange={change} onBusyChange={busy} />);
    expect(screen.getByAltText('Hotel photo 1')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Remove hotel photo 1'));
    expect(change).toHaveBeenLastCalledWith([]);
  });
  it('rejects duplicate URLs', () => {
    const change = vi.fn();
    render(<HotelImagePicker images={['https://example.com/hotel.jpg']} onChange={change} onBusyChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Hotel image URL'), { target: { value: 'https://example.com/hotel.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add URL' }));
    expect(screen.getByRole('alert').textContent).toContain('already attached');
    expect(change).not.toHaveBeenCalled();
  });
});
