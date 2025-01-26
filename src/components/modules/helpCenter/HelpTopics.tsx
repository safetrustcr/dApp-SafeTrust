"use client";

import { Book, CircleHelp, DollarSign, Shield } from "lucide-react";
import { ContainerHelpCenter } from "../utils/Containers";
import CardHelpTopic from "./ui/CardHelpTopic";

const HelpTopics = () => {
  return (
    <ContainerHelpCenter>
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <CardHelpTopic
          title="Getting Started"
          icon={CircleHelp}
          description="Learn the basics of using SafeTrust and set up your account."
          link="#"
        />

        <CardHelpTopic
          title="Security Features"
          icon={Shield}
          description="Understand the security measures in place to protect your assets."
          link="#"
        />

        <CardHelpTopic
          title="Managing Contracts"
          icon={Book}
          description="Learn how to create, modify and close smart contracts."
          link="#"
        />

        <CardHelpTopic
          title="Deposits and Withdrawals"
          icon={DollarSign}
          description="Understand how to manage your funds on SafeTrust"
          link="#"
        />

        <CardHelpTopic
          title="Dispute Resolution"
          icon={CircleHelp}
          description="Learn about our dispute resolution process and how it works."
          link="#"
        />

        <CardHelpTopic
          title="Account Settings"
          icon={CircleHelp}
          description="Manage your account preferences and security settings."
          link="#"
        />
      </div>
    </ContainerHelpCenter>
  );
};

export default HelpTopics;
