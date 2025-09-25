"use client";

import {
  Building,
  Edit,
  Search,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditDepartmentModal } from "./EditDepartmentModal";

// Types
export interface Department {
  id: string;
  name: string;
  tenant: string;
  description?: string;
}

// Mock data
export const departmentData: Department[] = [
  {
    id: "DEPT-001",
    name: "Engineering",
    tenant: "SafeTrust Corp",
    description: "Software development and technical operations",
  },
  {
    id: "DEPT-002", 
    name: "Marketing",
    tenant: "SafeTrust Corp",
    description: "Brand management and customer acquisition",
  },
  {
    id: "DEPT-003",
    name: "Finance",
    tenant: "TechFlow LLC",
    description: "Financial planning and accounting services",
  },
  {
    id: "DEPT-004",
    name: "Human Resources",
    tenant: "TechFlow LLC", 
    description: "Employee relations and talent management",
  },
  {
    id: "DEPT-005",
    name: "Operations",
    tenant: "BlockChain Solutions",
    description: "Daily operations and process management",
  },
  {
    id: "DEPT-006",
    name: "Customer Support",
    tenant: "BlockChain Solutions",
    description: "Customer service and technical support",
  },
  {
    id: "DEPT-007",
    name: "Legal",
    tenant: "SafeTrust Corp",
    description: "Legal compliance and contract management",
  },
  {
    id: "DEPT-008",
    name: "Research & Development",
    tenant: "Innovation Labs",
    description: "Product research and development initiatives",
  },
];

// Available tenants for filtering
export const tenantOptions = [
  "SafeTrust Corp",
  "TechFlow LLC", 
  "BlockChain Solutions",
  "Innovation Labs",
];

// DepartmentTable component
export function DepartmentTable({ 
  departments, 
  onEdit,
  isLoading = false,
  onClearFilters
}: { 
  departments: Department[];
  onEdit: (department: Department) => void;
  isLoading?: boolean;
  onClearFilters?: () => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="p-4">Department ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead className="w-[50px] p-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, index) => (
              <TableRow key={index}>
                <TableCell className="p-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No departments found</h3>
        <p className="text-muted-foreground mb-6">
          There are no departments matching your current filters.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="p-4">Department ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Tenant</TableHead>
            <TableHead className="w-[50px] p-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((department) => (
            <TableRow key={department.id}>
              <TableCell className="p-4 min-w-[110px]">{department.id}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" aria-hidden="true" />
                  {department.name}
                </div>
              </TableCell>
              <TableCell className="min-w-[170px]">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {department.tenant}
                </div>
              </TableCell>
              <TableCell align="center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(department)}
                  aria-label={`Edit ${department.name}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// DepartmentsPage component
export default function DepartmentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredDepartments = useMemo(() => {
    return departmentData.filter((department) => {
      const matchesSearch =
        department.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        department.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        department.tenant.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTenant =
        tenantFilter === "all" || department.tenant === tenantFilter;

      return matchesSearch && matchesTenant;
    });
  }, [searchQuery, tenantFilter]);

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setIsEditModalOpen(true);
  };

  const handleSaveDepartment = (updatedDepartment: Department) => {
    // Here you would typically make an API call to update the department
    console.log("Saving department:", updatedDepartment);
    
    // Update the local data (in a real app, this would be handled by your state management)
    const index = departmentData.findIndex(d => d.id === updatedDepartment.id);
    if (index !== -1) {
      departmentData[index] = updatedDepartment;
    }
    
    setIsEditModalOpen(false);
    setEditingDepartment(null);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingDepartment(null);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setTenantFilter("all");
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-[calc(100vh-129px)] bg-background p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Departments</h1>
        </div>
        <div className="rounded-lg border bg-card p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error loading departments</h3>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <Button variant="outline" onClick={() => setError(null)}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-129px)] bg-background p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Departments</h1>
        <div className="flex gap-2">
          <Button>Add Department</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Filter Departments</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" aria-hidden="true" />
            <Input
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search departments"
              className="text-sm"
            />
          </div>
          <Select value={tenantFilter} onValueChange={setTenantFilter}>
            <SelectTrigger aria-label="Filter by tenant">
              <SelectValue placeholder="All Tenants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenantOptions.map((tenant) => (
                <SelectItem key={tenant} value={tenant}>
                  {tenant}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <DepartmentTable 
        departments={filteredDepartments} 
        onEdit={handleEditDepartment}
        isLoading={isLoading}
        onClearFilters={handleClearFilters}
      />

      <EditDepartmentModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        department={editingDepartment}
        onSave={handleSaveDepartment}
        tenantOptions={tenantOptions}
      />
    </div>
  );
}
