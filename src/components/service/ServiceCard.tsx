import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Service } from '@/types/service';
import { MapPin, DollarSign, Clock, Star } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
  viewMode: 'grid' | 'list';
}

export const ServiceCard = ({ service, viewMode }: ServiceCardProps) => (
  <Card className={`${viewMode === 'list' ? 'w-full' : 'h-full'} cursor-pointer`}>
    <CardHeader>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">{service.title}</h3>
          <div className="flex items-center gap-2">
            <Star size={16} />
            <span>{service.rating}</span>
            <span className="text-gray-500">({service.reviews} reviews)</span>
          </div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0"></div>
      </div>
    </CardHeader>
    
    <CardContent>
      <p className="text-gray-600">{service.description}</p>
      
      <div className="mt-4 space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-1"><MapPin size={16} /> {service.location}</div>
          <div className="flex items-center gap-1"><DollarSign size={16} /> Starting from ${service.startingPrice}</div>
          <div className="flex items-center gap-1"><Clock size={16} /> {service.deliveryTime}</div>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {service.badges.map((badge, index) => (
          <Badge key={index} variant="secondary">
            {badge}
          </Badge>
        ))}
      </div>
    </CardContent>
    
    <CardFooter>
      <Button className="w-full" variant="outline">
        View Details
      </Button>
    </CardFooter>
  </Card>
); 