// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { SchemaConstraintsHint } from "../SchemaConstraintsHint";

describe("SchemaConstraintsHint", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the schema constraints header and rules", () => {
    render(<SchemaConstraintsHint />);

    expect(
      screen.getByText("Schema constraints (hotel_industry.hotels)")
    ).toBeDefined();

    expect(screen.getByText(/1–100 characters \(required\)/i)).toBeDefined();
    expect(screen.getByText(/1–200 characters \(required\)/i)).toBeDefined();
    expect(screen.getByText(/maximum 500 characters/i)).toBeDefined();
    expect(screen.getByText(/maximum 100 characters/i)).toBeDefined();
    expect(
      screen.getByText(
        /latitude -90 to 90, longitude -180 to 180 \(WGS 84, optional; both or neither\)/i
      )
    ).toBeDefined();
    expect(
      screen.getByText(/Placeholders on coordinate inputs: San José \(9.9281, -84.0907\)/i)
    ).toBeDefined();
  });
});
