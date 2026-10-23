'use client';

import type { HotelListing } from '@/@types/hotel';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FaMapMarkerAlt } from 'react-icons/fa';
import React from 'react';
import { useAuthUser } from '@/components/auth/hooks/auth.hook';
import { startConversation } from '@/lib/api/messages';
import { toast } from 'sonner';
import AmenityIcons from './AmenityIcons';
import { formatListingPrice } from './formatListingPrice';
import ImageGallery from './ImageGallery';

interface ApartmentDetailProps {
  apartment: HotelListing;
  onBook: () => void;
}

export default function ApartmentDetail({
  apartment,
  onBook,
}: ApartmentDetailProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const [isMessaging, setIsMessaging] = React.useState(false);

  const isOwner = user && apartment.owner?.id === user.uid;

  const handleMessageHost = async () => {
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
          onClick: handleMessageHost,
        },
      });
    } finally {
      setIsMessaging(false);
    }
  };

  // Hide button while loading auth or if user owns the listing
  const shouldShowMessageButton = !authLoading && !isOwner;
  return (
    <section className="flex-1 px-6 py-8 lg:px-10">
      <ImageGallery
        images={apartment.images}
        promoted={apartment.promoted}
        altText={apartment.name}
      />

      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-[#181818]">
            {apartment.name}
          </h1>

          <div className="mt-5 flex items-center gap-3 text-sm text-[#717171]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#fff1e7] text-[#ff6a00]">
              <FaMapMarkerAlt className="h-4 w-4" />
            </span>
            <span>{apartment.address}</span>
          </div>

          <div className="mt-8">
            <AmenityIcons
              bedrooms={apartment.bedrooms}
              bathrooms={apartment.bathrooms}
              petFriendly={apartment.petFriendly}
            />
          </div>
        </div>

        <div className="w-full rounded-[12px] lg:max-w-[210px]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onBook}
              className="flex-1 rounded-[8px] bg-[#ff6a00] px-6 py-4 text-xl font-semibold text-white transition hover:bg-[#ec6200]"
            >
              BOOK
            </button>
            {shouldShowMessageButton && (
              <button
                type="button"
                onClick={handleMessageHost}
                disabled={isMessaging}
                className="flex-1 rounded-[8px] border-2 border-[#ff6a00] bg-white px-6 py-4 text-xl font-semibold text-[#ff6a00] transition hover:bg-[#ff6a00] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMessaging ? 'Loading...' : 'Message host'}
              </button>
            )}
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-[34px] font-semibold leading-none text-[#10a156]">
              {formatListingPrice(apartment.price)}
            </span>
            <span className="pb-1 text-sm text-[#808080]">Per month</span>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <span className="text-sm font-medium text-[#5a5a5a]">
              {apartment.owner.name}
            </span>
            <Image
              src={apartment.owner.avatar}
              alt={apartment.owner.name}
              width={34}
              height={34}
              className="h-[34px] w-[34px] rounded-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="mt-10 max-w-[760px]">
        <h2 className="text-[22px] font-semibold text-[#1b1b1b]">
          Apartment details
        </h2>
        <p className="mt-4 text-sm leading-6 text-[#6d6d6d]">
          {apartment.description}
        </p>
      </div>
    </section>
  );
}
