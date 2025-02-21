import { Button } from "@/components/ui/button";

interface ServiceCardProps {
  title: string;
  description: string;
  price: string;
}

export const ServiceCard = ({ title, description, price }: ServiceCardProps) => (
  <div className="bg-card p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
    <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
    <p className="text-muted-foreground mb-4">{description}</p>
    <div className="flex justify-between items-center">
      <span className="text-primary font-medium">
        From ${price}
      </span>
      <Button variant="ghost" size="sm">
        Learn More
      </Button>
    </div>
  </div>
); 