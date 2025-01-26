import { Search, SlidersHorizontal } from 'lucide-react';
import { FilterState } from '../types';

interface SearchFiltersProps {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  onSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SearchFilters = ({ 
  filters, 
  setFilters, 
  sortBy, 
  setSortBy, 
  onSearch 
}: SearchFiltersProps) => (
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
    <div className="flex-1 relative">
      <input
        type="text"
        placeholder="Search services..."
        onChange={onSearch}
        className="w-full p-3 pr-10 border rounded-lg"
      />
      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
    </div>

    <select
      className="p-3 border rounded-lg w-full sm:w-auto"
      value={filters.category}
      onChange={(e) => setFilters({ ...filters, category: e.target.value })}
    >
      <option value="All Services">All Services</option>
      <option value="Development">Development</option>
      <option value="Consulting">Consulting</option>
    </select>

    <select
      className="p-3 border rounded-lg w-full sm:w-auto"
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
    >
      <option value="Highest Rated">Highest Rated</option>
      <option value="Price (Low to High)">Price (Low to High)</option>
      <option value="Price (High to Low)">Price (High to Low)</option>
      <option value="Most Reviews">Most Reviews</option>
    </select>

    <button 
      className="p-3 border rounded-lg w-full sm:w-auto"
    >
      <SlidersHorizontal className="h-5 w-5" />
    </button>
  </div>
); 