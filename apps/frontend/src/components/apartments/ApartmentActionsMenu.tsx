"use client";

import React, { useEffect, useRef, useState } from "react";
import { HiDotsVertical } from "react-icons/hi";
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
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => setIsOpen(false);

  const handleView = () => {
    closeMenu();
    if (onView) onView(apartment);
  };

  const handleEdit = () => {
    closeMenu();
    if (onEdit) onEdit(apartment);
  };

  const handleDelete = () => {
    closeMenu();
    if (onDelete) onDelete(apartment.id);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        aria-label="Apartment actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
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

      {isOpen && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            minWidth: 140,
            background: "white",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            zIndex: 10,
            overflow: "hidden",
          }}
        >
          {onView && (
            <button
              type="button"
              role="menuitem"
              onClick={handleView}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              View
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={handleEdit}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={handleDelete}
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                padding: "10px 12px",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
