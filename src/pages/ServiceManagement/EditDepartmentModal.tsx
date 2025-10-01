import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Department } from "./Departments";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department | null;
  onSave: (updatedDepartment: Department) => void;
  tenantOptions: string[];
}

export function EditDepartmentModal({ 
  isOpen, 
  onClose, 
  department, 
  onSave,
  tenantOptions
}: EditDepartmentModalProps) {
  const [editedDepartment, setEditedDepartment] = useState<Department | null>(null);

  // Update local state when the department prop changes or when modal opens
  useEffect(() => {
    if (isOpen && department) {
      setEditedDepartment(department);
    }
  }, [isOpen, department]);

  if (!department) return null;

  const handleChange = (field: keyof Department, value: any) => {
    if (editedDepartment) {
      setEditedDepartment({
        ...editedDepartment,
        [field]: value
      });
    }
  };

  const handleSave = () => {
    if (editedDepartment) {
      onSave(editedDepartment);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>
            Make changes to the department here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="name" className="text-right font-medium">
              Name
            </label>
            <Input
              id="name"
              value={editedDepartment?.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="tenant" className="text-right font-medium">
              Tenant
            </label>
            <Select
              value={editedDepartment?.tenant || ''}
              onValueChange={(value) => handleChange('tenant', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenantOptions.map((tenant) => (
                  <SelectItem key={tenant} value={tenant}>
                    {tenant}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="description" className="text-right font-medium">
              Description
            </label>
            <Textarea
              id="description"
              value={editedDepartment?.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="col-span-3"
              rows={3}
              placeholder="Optional description"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

