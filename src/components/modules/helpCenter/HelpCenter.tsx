"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContactSupport from "./ContactSupport";
import FAQ from "./FAQ";
import HelpTopics from "./HelpTopics";
import UserGuides from "./UserGuides";
import { useHelpCenter } from "./hooks/useHelpCenter";

const HelpCenter = () => {
  const { activeTab, setActiveTab } = useHelpCenter();

  return (
    <div className="flex w-full justify-center">
      <Card className="w-11/12 mt-6 shadow-none border-none">
        <CardHeader>
          <CardTitle className="text-2xl">Help Center</CardTitle>
          <div className="flex w-full justify-center">
            <div className="flex w-full md:w-1/3">
              <Input placeholder="Search for help..." />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 gap-3 mb-10 md:grid-cols-4">
              <TabsTrigger value="FAQ">FAQ</TabsTrigger>
              <TabsTrigger value="HelpTopics">Help Topics</TabsTrigger>
              <TabsTrigger value="ContactSupport">Contact Support</TabsTrigger>
              <TabsTrigger value="UserGuides">User Guides</TabsTrigger>
            </TabsList>
            <TabsContent value="FAQ">
              <FAQ />
            </TabsContent>
            <TabsContent value="HelpTopics">
              <HelpTopics />
            </TabsContent>
            <TabsContent value="ContactSupport">
              <ContactSupport />
            </TabsContent>
            <TabsContent value="UserGuides">
              <UserGuides />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpCenter;
