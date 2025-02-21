import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ServiceCard } from "./ServiceCard";

const services = [
  {
    title: "Smart Contract Development",
    description: "Custom smart contract development with security audits included.",
    price: "2,000",
  },
  {
    title: "Security Audits",
    description: "Comprehensive security analysis and vulnerability testing.",
    price: "1,500",
  },
  {
    title: "Blockchain Consulting",
    description: "Expert guidance on blockchain implementation strategies.",
    price: "500",
  },
];

export const ServicesSection = () => (
  <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-foreground">
          Our Services
        </h2>
        <Link href="/service-search">
          <Button variant="outline">
            View All Services
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {services.map((service, index) => (
          <ServiceCard key={index} {...service} />
        ))}
      </div>
    </div>
  </section>
); 