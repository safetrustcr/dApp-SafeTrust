'use client';
import React, { useState, useMemo } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { ServiceCard } from './_components/ServiceCard';
import { SearchFilters } from './_components/SearchFilters';
import { FilterState } from './types';
import { services } from './data';

const initialFilters: FilterState = {
  category: 'All Services',
  priceRange: { min: 0, max: 10000 },
  location: 'All Locations',
  deliveryTime: 'Any Time',
  badges: [],
};

const ServiceSearchPage = () => {
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
    <div className="flex flex-col flex-1 h-full">
      <div className="max-w-[1400px] w-full mx-auto px-4 py-6 flex flex-col flex-1">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold">Service Search</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <SearchFilters
            filters={filters}
            setFilters={setFilters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onSearch={handleSearch}
          />
        </div>

        {filteredAndSortedServices.length === 0 ? (
          <div className="flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-xl text-gray-500">No services found matching your criteria</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilters(initialFilters);
                setSortBy('Highest Rated');
              }}
              className="mt-4 text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className={`grid ${viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'grid-cols-1 gap-4'
            } overflow-y-auto h-[calc(100vh-200px)] no-scrollbar`}>
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

export default ServiceSearchPage;

