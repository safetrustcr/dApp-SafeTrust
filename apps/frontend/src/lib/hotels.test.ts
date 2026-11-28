import { describe, it, expect } from "vitest";
import {
  extractCoordinates,
  formatHotelCoordinates,
  formatHotelDate,
} from "./hotels";
import type { HotelGeoJSONPoint } from "@safetrust/types";

describe("Hotel Utilities", () => {
  describe("extractCoordinates", () => {
    it("extracts coordinates from GeoJSON Point object (longitude first, latitude second)", () => {
      const geo: HotelGeoJSONPoint = {
        type: "Point",
        coordinates: [-84.0907, 9.9281],
      };
      const result = extractCoordinates({ coordinates: geo });
      expect(result).toEqual({ latitude: 9.9281, longitude: -84.0907 });
    });

    it("extracts coordinates from stringified GeoJSON Point", () => {
      const geoStr = JSON.stringify({
        type: "Point",
        coordinates: [-84.0907, 9.9281],
      });
      const result = extractCoordinates({ coordinates: geoStr });
      expect(result).toEqual({ latitude: 9.9281, longitude: -84.0907 });
    });

    it("prefers explicit latitude and longitude fields when present", () => {
      const result = extractCoordinates({
        latitude: 10.5,
        longitude: -85.2,
        coordinates: { type: "Point", coordinates: [-84.0, 9.0] },
      });
      expect(result).toEqual({ latitude: 10.5, longitude: -85.2 });
    });

    it("returns null when coordinates are null or missing", () => {
      expect(extractCoordinates(null)).toBeNull();
      expect(extractCoordinates({})).toBeNull();
      expect(extractCoordinates({ coordinates: null })).toBeNull();
    });

    it("returns null for malformed GeoJSON", () => {
      expect(extractCoordinates({ coordinates: "invalid-json" })).toBeNull();
      expect(extractCoordinates({ coordinates: { type: "LineString" } as any })).toBeNull();
    });
  });

  describe("formatHotelCoordinates", () => {
    it("formats GeoJSON coordinates to readable lat, lng with 4 decimal places", () => {
      const hotel = {
        coordinates: {
          type: "Point" as const,
          coordinates: [-84.09072, 9.92806] as [number, number],
        },
      };
      expect(formatHotelCoordinates(hotel)).toBe("9.9281, -84.0907");
    });

    it("returns em dash '—' when no coordinates are present", () => {
      expect(formatHotelCoordinates(null)).toBe("—");
      expect(formatHotelCoordinates({})).toBe("—");
      expect(formatHotelCoordinates({ coordinates: null })).toBe("—");
    });
  });

  describe("formatHotelDate", () => {
    it("formats valid ISO timestamp to human readable date string", () => {
      const formatted = formatHotelDate("2026-09-30T12:00:00.000Z");
      expect(formatted).toContain("2026");
      expect(formatted).not.toBe("—");
    });

    it("returns em dash '—' for missing or invalid date", () => {
      expect(formatHotelDate(null)).toBe("—");
      expect(formatHotelDate(undefined)).toBe("—");
      expect(formatHotelDate("not-a-date")).toBe("—");
    });
  });
});
