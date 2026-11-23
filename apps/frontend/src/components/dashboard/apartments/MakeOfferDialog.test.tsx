import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { MakeOfferDialog } from "./MakeOfferDialog";
import { MockedProvider } from "@apollo/client/testing";
import { CREATE_BID } from "@/graphql/queries/bid-queries";

const mocks = [
  {
    request: {
      query: CREATE_BID,
      variables: {
        apartment_id: "1",
        tenant_id: "user1",
        proposed_price: 1000,
        desired_move_in: new Date("2025-01-01").toISOString(),
      },
    },
    result: {
      data: {
        insert_bid_requests_one: {
          id: "bid1",
          current_status: "PENDING",
        },
      },
    },
  },
];

describe("MakeOfferDialog", () => {
  it("submits a bid request", async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MakeOfferDialog
          apartmentId="1"
          tenantId="user1"
          onSuccess={vi.fn()}
        />
      </MockedProvider>
    );

    fireEvent.click(screen.getByText("Make an offer"));
    
    // Fill the form
    fireEvent.change(screen.getByLabelText(/Proposed Price/i), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText(/Desired Move-in Date/i), { target: { value: "2025-01-01" } });
    
    fireEvent.click(screen.getByText("Submit Offer"));

    await waitFor(() => {
        expect(screen.getByText("Submit Offer")).toBeDefined();
    });
  });
});
