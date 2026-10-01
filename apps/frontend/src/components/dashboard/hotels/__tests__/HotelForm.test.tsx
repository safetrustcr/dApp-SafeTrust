// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { HotelForm } from "../HotelForm";
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

describe("HotelForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders create hotel form with inputs, placeholders, and hint box", () => {
    render(<HotelForm mode="create" />);

    expect(screen.getByText("Create New Hotel")).toBeDefined();
    expect(screen.getByTestId("schema-constraints-hint")).toBeDefined();

    const nameInput = screen.getByTestId("hotel-name-input") as HTMLInputElement;
    const addressInput = screen.getByTestId("hotel-address-input") as HTMLInputElement;
    const latInput = screen.getByTestId("hotel-latitude-input") as HTMLInputElement;
    const lngInput = screen.getByTestId("hotel-longitude-input") as HTMLInputElement;

    expect(nameInput.value).toBe("");
    expect(addressInput.value).toBe("");
    expect(latInput.value).toBe("");
    expect(latInput.placeholder).toBe("9.9281");
    expect(lngInput.value).toBe("");
    expect(lngInput.placeholder).toBe("-84.0907");
  });

  it("validates required fields on submit (name and address required)", async () => {
    const createSpy = vi.spyOn(api, "createHotel");
    render(<HotelForm mode="create" />);

    const submitBtn = screen.getByTestId("hotel-submit-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("hotel-name-error")).toBeDefined();
      expect(screen.getByText("Hotel name is required")).toBeDefined();
    });

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("validates coordinates (both or neither rule)", async () => {
    const createSpy = vi.spyOn(api, "createHotel");
    render(<HotelForm mode="create" />);

    fireEvent.change(screen.getByTestId("hotel-name-input"), {
      target: { value: "Eco Lodge" },
    });
    fireEvent.change(screen.getByTestId("hotel-address-input"), {
      target: { value: "Monteverde, Costa Rica" },
    });
    fireEvent.change(screen.getByTestId("hotel-latitude-input"), {
      target: { value: "10.3163" },
    });

    fireEvent.click(screen.getByTestId("hotel-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("hotel-coordinates-error")).toBeDefined();
      expect(
        screen.getByText("Both latitude and longitude must be provided together")
      ).toBeDefined();
    });

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("validates coordinate boundaries (-90 to 90 for lat, -180 to 180 for lng)", async () => {
    render(<HotelForm mode="create" />);

    fireEvent.change(screen.getByTestId("hotel-name-input"), {
      target: { value: "Eco Lodge" },
    });
    fireEvent.change(screen.getByTestId("hotel-address-input"), {
      target: { value: "Monteverde, Costa Rica" },
    });
    fireEvent.change(screen.getByTestId("hotel-latitude-input"), {
      target: { value: "95" },
    });
    fireEvent.change(screen.getByTestId("hotel-longitude-input"), {
      target: { value: "-84.5" },
    });

    fireEvent.click(screen.getByTestId("hotel-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("hotel-latitude-error")).toBeDefined();
      expect(screen.getByText("Latitude must be between -90 and 90")).toBeDefined();
    });
  });

  it("submits valid create payload with null coordinates when placeholders are untouched", async () => {
    const createSpy = vi.spyOn(api, "createHotel").mockResolvedValueOnce({
      id: "h-123",
      name: "Grand Palace",
      address: "100 Main St",
      created_at: "2026-09-30T10:00:00Z",
      updated_at: "2026-09-30T10:00:00Z",
      owner_user_id: "u-1",
    });

    render(<HotelForm mode="create" />);

    fireEvent.change(screen.getByTestId("hotel-name-input"), {
      target: { value: "Grand Palace" },
    });
    fireEvent.change(screen.getByTestId("hotel-address-input"), {
      target: { value: "100 Main St" },
    });
    fireEvent.change(screen.getByTestId("hotel-location-area-input"), {
      target: { value: "Downtown" },
    });

    fireEvent.click(screen.getByTestId("hotel-submit-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "Grand Palace",
        address: "100 Main St",
        description: null,
        locationArea: "Downtown",
        latitude: null,
        longitude: null,
      });
      expect(mockPush).toHaveBeenCalledWith("/dashboard/hotels");
    });
  });

  it("submits valid create payload with numeric coordinates when filled", async () => {
    const createSpy = vi.spyOn(api, "createHotel").mockResolvedValueOnce({
      id: "h-123",
      name: "Grand Palace",
      address: "100 Main St",
      created_at: "2026-09-30T10:00:00Z",
      updated_at: "2026-09-30T10:00:00Z",
      owner_user_id: "u-1",
    });

    render(<HotelForm mode="create" />);

    fireEvent.change(screen.getByTestId("hotel-name-input"), {
      target: { value: "Grand Palace" },
    });
    fireEvent.change(screen.getByTestId("hotel-address-input"), {
      target: { value: "100 Main St" },
    });
    fireEvent.change(screen.getByTestId("hotel-latitude-input"), {
      target: { value: "9.9281" },
    });
    fireEvent.change(screen.getByTestId("hotel-longitude-input"), {
      target: { value: "-84.0907" },
    });

    fireEvent.click(screen.getByTestId("hotel-submit-btn"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "Grand Palace",
        address: "100 Main St",
        description: null,
        locationArea: null,
        latitude: 9.9281,
        longitude: -84.0907,
      });
    });
  });

  it("renders in edit mode with initial data, last updated badge, and submits update", async () => {
    const initialHotel: Hotel = {
      id: "h-789",
      name: "Boutique Hotel",
      address: "Beach Rd 5",
      location_area: "Pacific Coast",
      description: "Quiet resort by the sea",
      coordinates: {
        type: "Point",
        coordinates: [-85.1234, 10.5678],
      },
      created_at: "2026-09-01T12:00:00Z",
      updated_at: "2026-09-25T15:30:00Z",
      owner_user_id: "u-manager",
    };

    const updateSpy = vi.spyOn(api, "updateHotel").mockResolvedValueOnce({
      ...initialHotel,
      name: "Boutique Hotel Updated",
      updated_at: "2026-09-30T18:00:00Z",
    });

    render(<HotelForm mode="edit" hotelId="h-789" initialData={initialHotel} />);

    expect(screen.getByText("Edit Hotel")).toBeDefined();
    expect(screen.getByTestId("last-updated-badge")).toBeDefined();

    const nameInput = screen.getByTestId("hotel-name-input") as HTMLInputElement;
    expect(nameInput.value).toBe("Boutique Hotel");

    const latInput = screen.getByTestId("hotel-latitude-input") as HTMLInputElement;
    const lngInput = screen.getByTestId("hotel-longitude-input") as HTMLInputElement;
    expect(latInput.value).toBe("10.5678");
    expect(lngInput.value).toBe("-85.1234");

    // Modify name and submit
    fireEvent.change(nameInput, { target: { value: "Boutique Hotel Updated" } });
    fireEvent.click(screen.getByTestId("hotel-submit-btn"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("h-789", {
        name: "Boutique Hotel Updated",
        address: "Beach Rd 5",
        description: "Quiet resort by the sea",
        locationArea: "Pacific Coast",
        latitude: 10.5678,
        longitude: -85.1234,
      });
      expect(mockPush).toHaveBeenCalledWith("/dashboard/hotels");
    });
  });

  it("handles 403 authorization error on edit gracefully", async () => {
    const initialHotel: Hotel = {
      id: "h-789",
      name: "Boutique Hotel",
      address: "Beach Rd 5",
      created_at: "2026-09-01T12:00:00Z",
      updated_at: "2026-09-25T15:30:00Z",
      owner_user_id: "other-manager",
    };

    vi.spyOn(api, "updateHotel").mockRejectedValueOnce(
      new api.HotelApiError("Forbidden: only the owning manager or admin can update this hotel", 403)
    );

    render(<HotelForm mode="edit" hotelId="h-789" initialData={initialHotel} />);

    fireEvent.click(screen.getByTestId("hotel-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("hotel-form-error")).toBeDefined();
      expect(
        screen.getByText("You do not have permission to manage this hotel.")
      ).toBeDefined();
    });
  });
});
