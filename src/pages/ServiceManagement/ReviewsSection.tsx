"use client";

import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { useTheme } from "next-themes";

interface Review {
  author: string;
  date: string;
  comment: string;
  rating: number;
  initial: string;
}

interface ReviewSectionProps {
  reviews: Review[];
}

export function ReviewSection({ reviews }: ReviewSectionProps) {
  const { theme } = useTheme();

  return (
    <Card className="space-y-4 p-6">
      <h2 className="text-lg font-semibold">Client Reviews</h2>
      <p className="text-sm text-muted-foreground">
        Recent reviews from clients
      </p>
      <div className="grid gap-4">
        {reviews.map((review, index) => (
          <div
            key={index}
            className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-none"
          >
            <div className="flex gap-4">
              <Avatar className="h-10 w-10">
                <div className="bg-primary/10 w-full h-full rounded-full flex items-center justify-center md:text-lg text-md font-medium">
                  {review.initial}
                </div>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{review.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {review.date}
                    </p>
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? theme === "dark"
                              ? "text-white"
                              : "text-black"
                            : "text-gray-400"
                        }`}
                        fill={i < review.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm pt-4">{review.comment}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
