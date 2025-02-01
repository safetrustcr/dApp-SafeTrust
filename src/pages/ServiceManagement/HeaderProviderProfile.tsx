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
        <Button className="text-white bg-gradient-to-br from-blue-600 to-blue-800 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center">
          Contact Provider
        </Button>
      </div>
    </div>
  );
};

export default Header;
