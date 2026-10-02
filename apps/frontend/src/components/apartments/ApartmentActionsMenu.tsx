"use client";

import React from "react";
import { HiDotsVertical } from "react-icons/hi";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Apartment } from "../../types/types";

interface Props {
  apartment: Apartment;
  onEdit?: (apartment: Apartment) => void;
  onDelete?: (id: string) => void;
  onView?: (apartment: Apartment) => void;
}

export default function ApartmentActionsMenu({
  apartment,
  onEdit,
  onDelete,
  onView,
}: Props) {
  const handleView = () => {
    if (onView) onView(apartment);
  };

  const handleEdit = () => {
    if (onEdit) onEdit(apartment);
  };

  const handleDelete = () => {
    if (onDelete) onDelete(apartment.id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Apartment actions"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            border: "none",
            borderRadius: 6,
            background: "transparent",
            cursor: "pointer",
            color: "#2D3748",
          }}
        >
          <HiDotsVertical size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ minWidth: 140 }}>
        {onView && <DropdownMenuItem onSelect={handleView}>View</DropdownMenuItem>}
        {onEdit && <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>}
        {onDelete && <DropdownMenuItem onSelect={handleDelete}>Delete</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
