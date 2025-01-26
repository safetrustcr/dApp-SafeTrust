"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

interface CardHelpTopicProps {
  title: string;
  icon: React.ElementType;
  description: string;
  link: string;
}

const CardHelpTopic = ({
  title,
  icon: Icon,
  description,
  link,
}: CardHelpTopicProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="w-4 h-4 text-gray-500" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>

        <Link href={link} className="w-full mt-4 flex justify-between">
          <p className="text-sm">Explore</p>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </CardContent>
    </Card>
  );
};

export default CardHelpTopic;
