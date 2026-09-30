'use client';

import React from 'react';
import type { HotelListing } from '@/@types/hotel';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AiOutlineHeart } from 'react-icons/ai';
import { FaFireAlt } from 'react-icons/fa';
import { useAuthUser } from '@/components/auth/hooks/auth.hook';
import { startConversation } from '@/lib/api/messages';
import { toast } from 'sonner';
import AmenityIcons from './AmenityIcons';
import { formatListingPrice } from './formatListingPrice';

interface ApartmentCardProps {
  apartment: HotelListing;
  onClick?: () => void;
}

export default function ApartmentCard({
  apartment,
  onClick,
}: ApartmentCardProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const [isMessaging, setIsMessaging] = React.useState(false);

  const isOwner = user && apartment.owner?.id === user.uid;

  const handleMessageHost = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.href)}`);
      return;
    }

    if (isOwner) {
      return;
    }

    setIsMessaging(true);

    try {
      const response = await startConversation(apartment.id);
      router.push(`/dashboard/messages/${response.conversationId}`);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast.error('Failed to start conversation', {
        description: 'Please try again',
        action: {
          label: 'Retry',
          onClick: () => handleMessageHost(e),
        },
      });
    } finally {
      setIsMessaging(false);
    }
  };

  // Hide button while loading auth or if user owns the listing
  const shouldShowMessageButton = !authLoading && !isOwner;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full overflow-hidden rounded-[16px] border border-[#e7e2dc] bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
    >
      <div className="relative">
        <Image
          src={apartment.images[0]}
          alt={apartment.name}
          width={420}
          height={280}
          className="h-[170px] w-full object-cover"
        />
        {apartment.promoted ? (
          <span className="absolute bottom-0 left-0 inline-flex items-center gap-1 rounded-tr-[10px] bg-[#ff6a00] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.02em] text-white">
            <FaFireAlt className="h-3.5 w-3.5" />
            Promoted
          </span>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-end gap-2">
            <span className="text-[30px] font-semibold leading-none text-[#10a156]">
              {formatListingPrice(apartment.price)}
            </span>
            <span className="pb-1 text-xs text-[#8b8b8b]">Per month</span>
          </div>
          <AiOutlineHeart
            className={cn(
              'h-5 w-5',
              apartment.favorite
                ? 'fill-[#ff2c2c] text-[#ff2c2c]'
                : 'text-[#ff2c2c]'
            )}
          />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[#222222]">
            {apartment.name}
          </h3>
          <p className="line-clamp-1 text-xs text-[#8a8a8a]">
            {apartment.address}
          </p>
        </div>

        <AmenityIcons
          bedrooms={apartment.bedrooms}
          bathrooms={apartment.bathrooms}
          petFriendly={apartment.petFriendly}
          compact
        />

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="flex-1 rounded-lg bg-[#10a156] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d8a48]"
          >
            Book
          </button>
          {shouldShowMessageButton && (
            <button
              type="button"
              onClick={handleMessageHost}
              disabled={isMessaging}
              className="flex-1 rounded-lg border border-[#10a156] px-4 py-2 text-sm font-semibold text-[#10a156] transition hover:bg-[#10a156] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isMessaging ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#10a156] border-t-transparent" />
                  Loading...
                </span>
              ) : (
                'Message host'
              )}
            </button>
          )}
        </div>
      </div>
    </button>
  );
}
