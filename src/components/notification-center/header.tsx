import { Check, Filter } from "lucide-react";
import { CardDescription, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

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

      <div className="flex gap-2">
        <Button variant="tertiary" className="font-semibold">
          Create Alert
        </Button>

        <Button variant="secondary" className="font-semibold">
          <Filter className="h-5 w-5" />
          Filter
        </Button>

        <Button className="font-semibold" variant="secondary">
          <Check className="h-5 w-5" />
          Mark all as read
        </Button>
      </div>
    </div>
  );
};

export default Header;
