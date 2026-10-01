// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MyHotelsTable } from "../MyHotelsTable";
import * as api from "@/lib/api/hotels";
import type { Hotel } from "@safetrust/types";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock @apollo/client
vi.mock("@apollo/client", () => ({
  useQuery: () => ({
    data: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
  gql: (strings: TemplateStringsArray) => strings.join(""),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockHotels: Hotel[] = [
  {
    id: "h-1",
    name: "Hotel Real San José",
    address: "Calle 3, San José",
    location_area: "Downtown",
    coordinates: {
      type: "Point",
      coordinates: [-84.0907, 9.9281],
    },
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-20T12:00:00Z",
    owner_user_id: "user-1",
  },
  {
    id: "h-2",
    name: "Arenal Volcano Resort",
    address: "La Fortuna, San Carlos",
    location_area: "Arenal",
    coordinates: null,
    created_at: "2026-09-05T10:00:00Z",
    updated_at: "2026-09-25T12:00:00Z",
    owner_user_id: "user-1",
  },
];

describe("MyHotelsTable Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders table with columns: Name, Address, Location Area, Coordinates, Last Updated, Actions", () => {
    render(<MyHotelsTable initialHotels={mockHotels} />);

    expect(screen.getByText("Hotels")).toBeDefined();
    expect(screen.getByText("Name")).toBeDefined();
    expect(screen.getByText("Address")).toBeDefined();
    expect(screen.getByText("Location Area")).toBeDefined();
    expect(screen.getByText("Coordinates")).toBeDefined();
    expect(screen.getByText("Last Updated")).toBeDefined();
    expect(screen.getByText("Actions")).toBeDefined();

    expect(screen.getByText("Hotel Real San José")).toBeDefined();
    expect(screen.getByText("Arenal Volcano Resort")).toBeDefined();

    // Check formatted coordinates
    expect(screen.getByText("9.9281, -84.0907")).toBeDefined();
    expect(screen.getByText("—")).toBeDefined(); // For hotel 2 with null coordinates
  });

  it("filters hotels by search query", () => {
    render(<MyHotelsTable initialHotels={mockHotels} />);

    const searchInput = screen.getByTestId("hotel-search-input");
    fireEvent.change(searchInput, { target: { value: "Arenal" } });

    expect(screen.getByText("Arenal Volcano Resort")).toBeDefined();
    expect(screen.queryByText("Hotel Real San José")).toBeNull();
  });

  it("navigates to view and edit pages when action buttons are clicked", () => {
    render(<MyHotelsTable initialHotels={mockHotels} />);

    const viewBtn = screen.getByTestId("view-hotel-h-1");
    fireEvent.click(viewBtn);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/hotels/h-1");

    const editBtn = screen.getByTestId("edit-hotel-h-1");
    fireEvent.click(editBtn);
    expect(mockPush).toHaveBeenCalledWith("/dashboard/hotels/h-1/edit");
  });

  it("opens delete confirmation modal when delete button is clicked", () => {
    render(<MyHotelsTable initialHotels={mockHotels} />);

    const deleteBtn = screen.getByTestId("delete-hotel-h-1");
    fireEvent.click(deleteBtn);

    expect(screen.getByTestId("delete-hotel-dialog")).toBeDefined();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeDefined();
    expect(screen.getAllByText("Hotel Real San José").length).toBeGreaterThanOrEqual(2);
  });

  it("displays inline blocker message when delete returns 409 HOTEL_HAS_DEPENDENTS", async () => {
    const blockerMessage = "Cannot delete hotel: Remove this hotel's 3 rooms first.";
    vi.spyOn(api, "deleteHotel").mockRejectedValueOnce(
      new api.HotelApiError(blockerMessage, 409, {
        code: "HOTEL_HAS_DEPENDENTS",
        message: blockerMessage,
      })
    );

    render(<MyHotelsTable initialHotels={mockHotels} />);

    // Click delete on row
    fireEvent.click(screen.getByTestId("delete-hotel-h-1"));

    // Confirm in modal
    fireEvent.click(screen.getByTestId("confirm-delete-hotel-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("delete-blocker-message")).toBeDefined();
      expect(screen.getByText(blockerMessage)).toBeDefined();
      expect(screen.getByText(/deletion blocked/i)).toBeDefined();
    });
  });

  it("deletes hotel successfully and closes modal when hotel has no dependents", async () => {
    const deleteSpy = vi.spyOn(api, "deleteHotel").mockResolvedValueOnce({
      success: true,
      id: "h-1",
    });

    render(<MyHotelsTable initialHotels={mockHotels} />);

    fireEvent.click(screen.getByTestId("delete-hotel-h-1"));
    fireEvent.click(screen.getByTestId("confirm-delete-hotel-btn"));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("h-1");
      expect(screen.queryByTestId("delete-blocker-message")).toBeNull();
    });
  });
});
