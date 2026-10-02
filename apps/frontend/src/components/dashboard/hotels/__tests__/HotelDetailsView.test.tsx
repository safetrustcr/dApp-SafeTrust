// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HotelDetailsView } from "../HotelDetailsView";
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
  }),
  gql: (strings: TemplateStringsArray) => strings.join(""),
}));

const mockHotel: Hotel = {
  id: "h-view-1",
  name: "Playa Hermosa Resort",
  address: "Playa Hermosa, Guanacaste",
  location_area: "Guanacaste",
  description: "Beachfront paradise with ocean views.",
  coordinates: {
    type: "Point",
    coordinates: [-85.6789, 10.5432],
  },
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-20T12:00:00Z",
  owner_user_id: "u-view",
};

describe("HotelDetailsView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders hotel details with name, address, location area, coordinates, and description", () => {
    render(<HotelDetailsView hotelId="h-view-1" initialData={mockHotel} />);

    expect(screen.getByText("Playa Hermosa Resort")).toBeDefined();
    expect(screen.getByText("Playa Hermosa, Guanacaste")).toBeDefined();
    expect(screen.getByText("Guanacaste")).toBeDefined();
    expect(screen.getByText("10.5432, -85.6789")).toBeDefined();
    expect(screen.getByText("Beachfront paradise with ocean views.")).toBeDefined();
  });

  it("navigates to edit hotel page when Edit Hotel button is clicked", () => {
    render(<HotelDetailsView hotelId="h-view-1" initialData={mockHotel} />);

    const editBtn = screen.getByTestId("edit-hotel-btn");
    fireEvent.click(editBtn);

    expect(mockPush).toHaveBeenCalledWith("/dashboard/hotels/h-view-1/edit");
  });
});
