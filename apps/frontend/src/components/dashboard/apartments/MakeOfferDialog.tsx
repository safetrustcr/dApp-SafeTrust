"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CREATE_BID } from "@/graphql/queries/bid-queries";

export function MakeOfferDialog({
  apartmentId,
  tenantId,
  onSuccess,
}: {
  apartmentId: string;
  tenantId: string;
  onSuccess: () => void;
}) {
  const [price, setPrice] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [createBid, { loading }] = useMutation(CREATE_BID);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBid({
        variables: {
          apartment_id: apartmentId,
          tenant_id: tenantId,
          proposed_price: parseFloat(price),
          desired_move_in: new Date(moveIn).toISOString(),
        },
      });
      toast.success("Offer submitted successfully");
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit offer");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Make an offer</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make an offer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Proposed Price ($)</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Desired Move-in Date</Label>
            <Input
              type="date"
              value={moveIn}
              onChange={(e) => setMoveIn(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Offer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
