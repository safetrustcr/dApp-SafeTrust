"use client";
import { Star, Phone, Mail } from "lucide-react";
import { FaShieldAlt, FaGlobe } from "react-icons/fa";
import { Badge } from "@/components/ui/badge"

import { useState } from "react";


import { TabNavigation } from "./TabsNavigation";
import { PerformanceStats } from "./PerformanceStatsSection";
import { ServiceTable } from "./ServicesTableSection";
import { ReviewSection } from "./ReviewsSection";
import { CertificationSection } from "./CertificationsSection";


import { FaFileContract } from "react-icons/fa";

import { Card } from "../../../components/ui/card";
import Header from "./Header";
import { Avatar } from "@/components/ui/avatar";
import { ProviderData } from "@/lib/types";

export function ProviderProfile() {
  const [activeTab, setActiveTab] = useState("Services");

  const providerData: ProviderData = {
    name: "BlockTech Solutions",
    email: "contact@blocktech.com",
    website: "www.blocktech.com",
    phone: "+1 (555) 123-4567",
    license: "BT-2023-789",
    rating: 4.8,
    reviewCount: 156,
  };

  const reviews = [
    {
      author: "John Smith",
      date: "Dec 20, 2023",
      comment:
        "Excellent service! The smart contract was delivered on time and worked perfectly.",
      rating: 5,
      initial: "J",
    },
    {
      author: "Alice Johnson",
      date: "Dec 18, 2023",
      comment:
        "Very professional team. Good communication throughout the project.",
      rating: 4,
      initial: "A",
    },
    {
      author: "Robert Wilson",
      date: "Dec 15, 2023",
      comment:
        "Top-notch security audit service. Found and fixed critical vulnerabilities.",
      rating: 5,
      initial: "R",
    },
  ];

  return (
    <div className="min-h-screen min-w-full bg-background">
      <div className="mx-auto md:px-10 px-4 p-4">
        <Header />

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 pl-4 pt-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0">
                  <Avatar className="w-full h-full rounded-full" />
                </div>

                <div className="flex-grow space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-semibold">
                      {providerData.name}
                    </h2>
                    <Badge variant="secondary">Verified</Badge>
                  </div>
                  <div className="flex items-center gap-1 ">
                    <FaFileContract />

                    <p className="text-muted-foreground">
                      Smart Contract Development
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-black text-black-400" />
                    <span className="text-sm">
                      {providerData.rating} ({providerData.reviewCount} reviews)
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 md:pb-0 pb-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 pb-3">
                    {" "}
                    <Mail className="h-4 w-4 text-primary" /> {/* Phone icon */}
                    <p>{providerData.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {" "}
                    <FaGlobe className="h-4 w-4 text-primary" />{" "}
                    {/* Phone icon */}
                    <p>{providerData.website}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 pb-3">
                    {" "}
                    <Phone className="h-4 w-4 text-primary" />{" "}
                    <p>{providerData.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {" "}
                    <FaShieldAlt className="h-4 w-4 text-primary" />{" "}
                    <p>License: {providerData.license}</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="lg:col-span-1">
              <PerformanceStats />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-0  md:px-10 px-4 p-4">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === "Services" && <ServiceTable />}
        {activeTab === "Reviews" && <ReviewSection reviews={reviews} />}
        {activeTab === "Certifications" && <CertificationSection />}
      </div>
    </div>
  );
}

export default ProviderProfile;
