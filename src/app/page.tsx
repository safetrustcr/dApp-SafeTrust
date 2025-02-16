"use client";

import { DashboardFooter } from "@/layouts/Footer";
import ThemeToggle from "@/layouts/ThemeToggle";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Github } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="h-screen flex flex-col">
      <header className="flex justify-between items-center p-6 bg-white dark:bg-background text-black dark:text-gray-100 shadow-md">
        <ThemeToggle />
        <button
          type="button"
          className="text-white bg-gradient-to-br from-blue-600 to-blue-800 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-green-200 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
          onClick={() => router.push("/auth/login")}
        >
          Sign Up
        </button>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center text-center px-6 md:px-20 lg:px-32">
        <h1 className="text-4xl md:text-6xl font-bold text-black dark:text-gray-100">
          Secure Your Transactions with <br /> SafeTrust
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-2xl">
          A decentralized platform ensuring trust in peer-to-peer transactions. 
          SafeTrust leverages blockchain technology to safeguard deposits, enhance security, 
          and provide seamless cryptocurrency payments.
        </p>

        <div className="mt-6 flex gap-4">
  <a
    href="https://app.onlydust.com/projects/safetrust/overview"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 text-white bg-gray-800 hover:bg-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
  >
    <Image 
      src="/img/onlydust.png" 
      alt="OnlyDust" 
      width={28} 
      height={28} 
      className="w-6 h-6"
    />
    OnlyDust
  </a>
  <a
    href="https://github.com/safetrustcr"
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-2 text-white bg-gray-800 hover:bg-gray-900 focus:ring-4 focus:outline-none focus:ring-gray-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
  >
    <Github size={20} />
    GitHub
  </a>
</div>
      </main>

      <DashboardFooter />
    </div>
  );
}
