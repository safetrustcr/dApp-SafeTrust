"use client";

import { useEffect, useState } from "react";
import {
  EditProfileForm,
  type ProfileFormValues,
} from "@/components/dashboard/profile/EditProfileForm";
import { ProfileSettingsSidebar } from "@/components/dashboard/profile/ProfileSettingsSidebar";
import { useAuthUser } from "@/components/auth/hooks/auth.hook";

function splitDisplayName(displayName?: string | null) {
  const [firstName = "", ...lastNameParts] = displayName?.trim().split(/\s+/) ?? [];
  return { firstName, lastName: lastNameParts.join(" ") };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const { user } = useAuthUser();

  useEffect(() => {
    if (!user) return;

    const { firstName, lastName } = splitDisplayName(user.displayName);
    setProfile((current) => ({
      ...current,
      firstName: current.firstName || firstName,
      lastName: current.lastName || lastName,
      email: current.email || user.email || "",
    }));
  }, [user]);

  return (
    <div className="flex w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden dark:bg-gray-900 dark:border-gray-700">
      <ProfileSettingsSidebar />
      <div className="flex-1 min-w-0 p-6 lg:p-8">
        <EditProfileForm
          key={`${profile.email}-${profile.firstName}-${profile.lastName}`}
          initialValues={profile}
          onSave={setProfile}
        />
      </div>
    </div>
  );
}
