import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Check, Filter } from "lucide-react";

const Header = () => {
  return (
    <div className="flex gap-y-4 flex-col lg:flex-row lg:justify-between lg:items-center">
      <div>
        <CardTitle className="text-2xl font-semibold">
          Notification Center
        </CardTitle>
        <CardDescription className="text-sm">
          Manage and track all your contract notifications
        </CardDescription>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="tertiary">Create Alert</Button>

        <Button variant="secondary">
          <Filter className="h-5 w-5" />
          Filter
        </Button>

        <Button variant="secondary">
          <Check className="h-5 w-5" />
          Mark all as read
        </Button>
      </div>
    </div>
  );
};

export default Header;
