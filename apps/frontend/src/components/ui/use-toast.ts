// apps/frontend/src/components/ui/use-toast.ts
// shadcn/ui toast hook — re-exports from sonner which is already installed.
// MessageComposer.tsx imports { useToast } from '@/components/ui/use-toast'

import { toast } from 'sonner';

export type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

/**
 * useToast — thin wrapper over sonner that matches the shadcn/ui useToast API.
 * Components call: const { toast } = useToast();
 * Then: toast({ title: 'Success', description: 'Done.' });
 */
export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastProps) => {
      if (variant === 'destructive') {
        toast.error(title, { description });
      } else {
        toast.success(title, { description });
      }
    },
    dismiss: toast.dismiss,
  };
}