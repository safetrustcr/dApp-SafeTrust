'use client';
import React, { useState, useMemo } from 'react';
import { LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ServiceCard } from '@/components/service/ServiceCard';
import { FilterState } from '@/types/service';
import { services } from '@/data/services';

const initialFilters: FilterState = {
  category: 'All Services',
  priceRange: { min: 0, max: 10000 },
  location: 'All Locations',
  deliveryTime: 'Any Time',
  badges: [],
};

export const ServiceSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Highest Rated');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredAndSortedServices = useMemo(() => {
    let filtered = services;

    filtered = filtered.filter(service => {
      const matchesSearch = !searchTerm ||
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filters.category === 'All Services' ||
        service.category === filters.category;

      const matchesPrice = service.startingPrice >= filters.priceRange.min &&
        service.startingPrice <= filters.priceRange.max;

      const matchesLocation = filters.location === 'All Locations' ||
        service.location === filters.location;

      const matchesBadges = filters.badges.length === 0 ||
        filters.badges.every(badge => service.badges.includes(badge));

      return matchesSearch && matchesCategory && matchesPrice &&
        matchesLocation && matchesBadges;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'Highest Rated':
          return b.rating - a.rating;
        case 'Price (Low to High)':
          return a.startingPrice - b.startingPrice;
        case 'Price (High to Low)':
          return b.startingPrice - a.startingPrice;
        case 'Most Reviews':
          return b.reviews - a.reviews;
        default:
          return 0;
      }
    });
  }, [searchTerm, sortBy, filters]);

  return (
    <div className="w-full">
      <div className="max-w-[1400px] w-full mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl font-bold">Service Search</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-accent' : ''}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-accent' : ''}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Search services..."
                onChange={handleSearch}
                className="w-full pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            <Select
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value })}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Services">All Services</SelectItem>
                <SelectItem value="Development">Development</SelectItem>
                <SelectItem value="Consulting">Consulting</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={sortBy}
              onValueChange={setSortBy}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Highest Rated">Highest Rated</SelectItem>
                <SelectItem value="Price (Low to High)">Price (Low to High)</SelectItem>
                <SelectItem value="Price (High to Low)">Price (High to Low)</SelectItem>
                <SelectItem value="Most Reviews">Most Reviews</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {filteredAndSortedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">No services found matching your criteria</p>
            <Button
              variant="link"
              onClick={() => {
                setSearchTerm('');
                setFilters(initialFilters);
                setSortBy('Highest Rated');
              }}
              className="mt-4"
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className={`grid ${viewMode === 'grid'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'grid-cols-1 gap-4'
          }`}>
            {filteredAndSortedServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceSearch;
