import { Button } from "@/components/ui/button";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Check, Filter, PlusCircle } from "lucide-react";

interface HeaderProps {
  onMarkAllAsRead: () => void;
}

const Header = ({ onMarkAllAsRead }: HeaderProps) => {
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
        <Button variant="tertiary">
          <PlusCircle className="h-5 w-5 mr-1" />
          Create Alert
        </Button>

        <Button variant="secondary">
          <Filter className="h-5 w-5 mr-1" />
          Filter
        </Button>

        <Button variant="secondary" onClick={onMarkAllAsRead}>
          <Check className="h-5 w-5 mr-1" />
          Mark all as read
        </Button>
      </div>
    </div>
  );
};

export default Header;