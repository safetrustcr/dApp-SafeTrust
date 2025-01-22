"use client";

import { CardDescription, CardTitle } from "@/components/ui/card";
import { Laptop } from "lucide-react";
import Link from "next/link";

interface ItemUserGuideProps {
  title: string;
  description: string;
  link: string;
}

const ItemUserGuide = ({ title, description, link }: ItemUserGuideProps) => {
  return (
    <div className="flex">
      <div className="flex justify-center items-center bg-gray-100 w-10 h-10 rounded-full mr-3">
        <Laptop className="w-4 h-4" />
      </div>
      <div className="flex flex-col gap-2 w-full mb-5">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>

        <Link className="font-semibold text-xs w-1/6" href={link}>
          Read guide
        </Link>
      </div>
    </div>
  );
};

export default ItemUserGuide;
