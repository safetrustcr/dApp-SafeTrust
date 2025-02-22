import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const HeroSection = () => (
  <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-background">
    <div className="max-w-7xl mx-auto">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-6">
          Secure Smart Contract Solutions
          <span className="text-primary"> for Your Business</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Build, deploy, and manage secure smart contracts with our comprehensive platform. 
          Expert solutions for blockchain technology implementation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="text-lg px-8">
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  </section>
); 