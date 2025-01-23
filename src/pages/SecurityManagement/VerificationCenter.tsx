import React from "react";
import { Search, ChevronRight } from "lucide-react";

interface VerificationCardProps {
  title: string;
  description: string;
}

const VerificationCard: React.FC<VerificationCardProps> = ({
  title,
  description,
}) => (
  <div className="w-full border rounded-lg flex justify-center items-center mb-6 bg-white dark:bg-gray-800 dark:border-gray-700">
    <div className="w-[95%] py-5 px-4">
      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="my-2 text-sm text-gray-600 dark:text-gray-300">
        {description}
      </p>
      <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center">
        Explore <ChevronRight className="ml-1" size={16} />
      </button>
    </div>
  </div>
);

export default function VerificationCenter() {
  const verificationOptions: VerificationCardProps[] = [
    {
      title: "Document Upload",
      description: "Upload and manage your verification documents securely",
    },
    {
      title: "Identity Verification",
      description: "Verify your personal identity and contact information",
    },
    {
      title: "Business Verification",
      description: "Validate your business credentials and legal information",
    },
    {
      title: "Service Provider",
      description: "Complete your service provider verification requirements",
    },
  ];

  return (
    <main className="w-[1110px] mx-auto px-4 py-6 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="my-6 text-2xl font-bold text-gray-900 dark:text-white">
        Verification Center
      </h1>

      <div className="mb-6">
        <div className="relative">
          <label htmlFor="search" className="sr-only">
            Search verification requirements
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-gray-400 dark:text-gray-500" />
          </div>
          <input
            id="search"
            type="search"
            placeholder="Search for verification requirements"
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none 
              bg-white dark:bg-gray-800 
              text-gray-900 dark:text-white 
              border-gray-300 dark:border-gray-600
              placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      <nav className="mb-6">
        <ul className="flex flex-wrap gap-4 text-sm">
          {["Requirements", "Documents", "Status", "Support"].map((tab) => (
            <li
              key={tab}
              className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 
                rounded cursor-pointer 
                text-gray-700 dark:text-gray-300"
            >
              {tab}
            </li>
          ))}
        </ul>
      </nav>

      {verificationOptions.map((option, index) => (
        <VerificationCard
          key={index}
          title={option.title}
          description={option.description}
        />
      ))}
    </main>
  );
}
