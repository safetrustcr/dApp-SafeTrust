import { Service } from '../types';

interface ServiceCardProps {
  service: Service;
  viewMode: 'grid' | 'list';
}

export const ServiceCard = ({ service, viewMode }: ServiceCardProps) => (
  <div className={`border rounded-lg p-6 hover:shadow-lg transition-shadow ${viewMode === 'list' ? 'w-full' : 'h-full'} cursor-pointer`}>
    <div className={`${viewMode === 'list' ? 'flex gap-6' : ''}`}>
      <div className={`flex ${viewMode === 'list' ? 'flex-1' : 'flex-col'} gap-4`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">★</span>
              <span>{service.rating}</span>
              <span className="text-gray-500">({service.reviews} reviews)</span>
            </div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0"></div>
        </div>
        
        <p className="text-gray-600">{service.description}</p>
      </div>
      
      <div className={`${viewMode === 'list' ? 'flex flex-col justify-between min-w-[200px]' : ''}`}>
        <div className="space-y-2 text-sm text-gray-600">
          <div>📍 {service.location}</div>
          <div>💰 Starting from ${service.startingPrice}</div>
          <div>⏱️ {service.deliveryTime}</div>
        </div>
        
        <div className={`${viewMode === 'list' ? 'mt-2' : 'mt-4'} flex flex-wrap gap-2`}>
          {service.badges.map((badge, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-gray-100 rounded-full text-sm"
            >
              {badge}
            </span>
          ))}
        </div>
        
        <button className={`${viewMode === 'list' ? 'mt-2' : 'mt-4'} w-full py-2 text-center border rounded-lg hover:bg-gray-50`}>
          View Details
        </button>
      </div>
    </div>
  </div>
); 