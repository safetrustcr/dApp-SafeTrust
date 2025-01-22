"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ContainerHelpCenter } from "../utils/Containers";
import { Button } from "@/components/ui/button";
import { MoveRight } from "lucide-react";

const ContactSupport = () => {
  return (
    <ContainerHelpCenter>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Contact Support</CardTitle>
          <CardDescription>
            Get in touch with our support team for personalized assistance.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 w-full mb-5">
            <CardTitle className="text-sm">Email Support</CardTitle>
            <CardDescription>
              For general inquires and non-urgen issues:{" "}
              <strong>support@safetrust.com</strong>
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 w-full mb-5">
            <CardTitle className="text-sm">Phone Support</CardTitle>
            <CardDescription>
              For urgent matters and inmediate assistance:{" "}
              <strong>+1(800) 123-4567</strong>
            </CardDescription>
          </div>

          <div className="flex flex-col gap-2 w-full mb-5">
            <CardTitle className="text-sm">Live Chat</CardTitle>
            <CardDescription>
              Chat with a support representative in real-time during business
              hours.
            </CardDescription>
          </div>

          <Button
            type="button"
            onClick={() => console.log("live chat")}
            className="flex gap-5"
          >
            Start Live Chat <MoveRight />
          </Button>
        </CardContent>
      </Card>
    </ContainerHelpCenter>
  );
};

export default ContactSupport;
