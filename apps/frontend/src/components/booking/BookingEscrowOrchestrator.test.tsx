// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookingEscrowOrchestrator } from "./BookingEscrowOrchestrator";

const query = vi.hoisted(() => vi.fn());
vi.mock("@apollo/client", async () => ({ ...(await vi.importActual("@apollo/client")), useQuery: query }));
vi.mock("@/components/escrow/EscrowPayFlow", () => ({ EscrowPayFlow: ({ amount }: { amount: number }) => <button>Deposit {amount}</button> }));
vi.mock("@/components/ui/image", () => ({ Image: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));

afterEach(cleanup);
describe("booking review", () => {
  it("uses the warranty deposit and attached photos, and awaits deployment", () => {
    query.mockReturnValue({ data: { apartments: [{ id: "listing", name: "Apartment", price: 1200, warranty_deposit: 2400, image_urls: ["data:image/jpeg;base64,photo"], owner: null }] } });
    render(<BookingEscrowOrchestrator subject={{ kind: "apartment", id: "listing" }} />);
    expect(screen.getByRole("button").textContent).toBe("Deposit 2400");
    expect(screen.getByAltText("Apartment photo 1").getAttribute("src")).toBe("data:image/jpeg;base64,photo");
    expect(screen.getByText("Awaiting deployment")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain("owner must link a Stellar wallet");
  });
  it("does not offer payment for an unavailable listing", () => {
    query.mockReturnValue({ data: { apartments: [] } });
    render(<BookingEscrowOrchestrator subject={{ kind: "apartment", id: "missing" }} />);
    expect(screen.getByText("This listing is unavailable")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
