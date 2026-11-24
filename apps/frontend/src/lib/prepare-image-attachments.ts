/** Prepare portable image attachments for the existing image storage fields. */
export async function prepareImageAttachments(files: File[]): Promise<string[]> {
  return Promise.all(files.map(async (file) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      throw new Error('Use JPEG, PNG, or WebP images up to 10 MB each.');
    }
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to prepare image.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL('image/jpeg', 0.8);
      if (image.length > 700000) throw new Error('Image is too detailed. Please choose a smaller image.');
      return image;
    } finally { bitmap.close(); }
  }));
}
