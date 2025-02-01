import React from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title = "Provider Profile" }) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="md:text-2xl text-lg font-bold  sm:mb-0">{title}</h1>
      <div className="flex ">
        <Button className="w-full sm:w-auto  md:text-lg text-base ">
          Contact Provider
        </Button>
      </div>
    </div>
  );
};

export default Header;
