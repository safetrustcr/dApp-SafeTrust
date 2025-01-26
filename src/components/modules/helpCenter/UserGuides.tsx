"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContainerHelpCenter } from "../utils/Containers";
import ItemUserGuide from "./ui/ItemUserGuide";

const UserGuides = () => {
  return (
    <ContainerHelpCenter>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">User Guides</CardTitle>
          <CardDescription>
            Comprehensive guides to help you navigate SafeTrust's features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ItemUserGuide
            title="Complete Guide to Smart Contracts"
            description="Learn everything about creating and managing smart contracts on SafeTrust"
            link="#"
          />

          <ItemUserGuide
            title="Security Best Practices"
            description="Discover how to keep your account and transactions secure."
            link="#"
          />

          <ItemUserGuide
            title="Escrow Services Explained"
            description="Understand how to use SafeTrust's escrow services for secure transactions."
            link="#"
          />

          <ItemUserGuide
            title="Dispute Resolution Process"
            description="A step-by-step guide to resolving disputes on the SafeTrust platform."
            link="#"
          />

          <ItemUserGuide
            title="Managing Multiple Contracts"
            description="Tips and tricks for efficiently managing multiple contracts simultaneously."
            link="#"
          />
        </CardContent>
      </Card>
    </ContainerHelpCenter>
  );
};

export default UserGuides;
