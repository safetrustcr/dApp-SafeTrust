"use client";

import React, { useState } from "react";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from "@chakra-ui/react";
import { HiDotsVertical } from "react-icons/hi";
import { Apartment } from "@/types";

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
  const [isOpen, setIsOpen] = useState(false);

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
    <Menu isOpen={isOpen} onClose={() => setIsOpen(false)}>
      <MenuButton
        as={IconButton}
        icon={<HiDotsVertical />}
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Apartment actions"
      />
      <MenuList>
        {onView && <MenuItem onClick={handleView}>View</MenuItem>}
        {onEdit && <MenuItem onClick={handleEdit}>Edit</MenuItem>}
        {onDelete && <MenuItem onClick={handleDelete}>Delete</MenuItem>}
      </MenuList>
    </Menu>
  );
}
