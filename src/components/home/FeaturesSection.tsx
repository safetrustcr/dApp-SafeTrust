import { Shield, Zap, Globe } from 'lucide-react';
import { FeatureCard } from './FeatureCard';

const features = [
  {
    icon: Shield,
    title: "Maximum Security",
    description: "Enterprise-grade security protocols to protect your smart contracts and assets.",
  },
  {
    icon: Zap,
    title: "Fast Development",
    description: "Rapid development and deployment of smart contracts with our expert team.",
  },
  {
    icon: Globe,
    title: "Global Coverage",
    description: "Worldwide network of blockchain experts and support available 24/7.",
  },
];

export const FeaturesSection = () => (
  <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Why Choose SafeTrust
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          We provide comprehensive solutions for all your blockchain needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </div>
  </section>
); 