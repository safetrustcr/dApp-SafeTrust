"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, MapPin, DollarSign, Clock, Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LeftField = {
  id: string;
  label: string;
  icon: React.ElementType;
  value: string;
  set: (v: string) => void;
  type: string;
};

export function NewApartmentForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [promotion, setPromotion] = useState("0");
  const [details, setDetails] = useState("");
  const [rooms, setRooms] = useState("1");
  const [baths, setBaths] = useState("1");
  const [petFriendly, setPetFriendly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // TODO: wire to Hasura INSERT INTO public.apartments
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push("/dashboard/apartments");
    } finally {
      setIsLoading(false);
    }
  };

  const leftFields: LeftField[] = [
    {
      id: "apt-name",
      label: "Apartment name",
      icon: Home,
      value: name,
      set: setName,
      type: "text",
    },
    {
      id: "apt-location",
      label: "Location",
      icon: MapPin,
      value: location,
      set: setLocation,
      type: "text",
    },
    {
      id: "apt-amount",
      label: "Amount to pay",
      icon: DollarSign,
      value: amount,
      set: setAmount,
      type: "number",
    },
  ];

  const roomOpts = ["1", "2", "3", "4", "5"];
  const bathOpts = ["1", "2", "3", "4"];
  const promotionOpts = ["0", "5", "10", "15", "20", "25"];

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        New apartment
      </h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* ── Left column ── */}
        <div className="space-y-5">
          {leftFields.map(({ id, label, icon: Icon, value, set, type }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md bg-orange-100 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-orange-500" />
                </div>
                <Input
                  id={id}
                  type={type}
                  className="pl-11"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  required
                />
              </div>
            </div>
          ))}

          {/* Promotion percent */}
          <div className="space-y-1.5">
            <Label htmlFor="apt-promotion">Promotion percent</Label>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-orange-100 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-orange-500" />
              </div>
              <Select value={promotion} onValueChange={setPromotion}>
                <SelectTrigger id="apt-promotion" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {promotionOpts.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rooms / Bathrooms / Pet friendly */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label htmlFor="apt-rooms">Rooms</Label>
              <Select value={rooms} onValueChange={setRooms}>
                <SelectTrigger id="apt-rooms" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roomOpts.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="apt-baths">Bathrooms</Label>
              <Select value={baths} onValueChange={setBaths}>
                <SelectTrigger id="apt-baths" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {bathOpts.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pb-0.5">
              <Checkbox
                id="apt-pet"
                checked={petFriendly}
                onCheckedChange={(checked) => setPetFriendly(Boolean(checked))}
                className="border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <Label htmlFor="apt-pet">Pet friendly</Label>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">
          {/* Apartment details textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="apt-details">Apartment details</Label>
            <Textarea
              id="apt-details"
              rows={6}
              className="resize-none focus-visible:ring-orange-400"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {/* Image upload slots */}
          <div className="space-y-1.5">
            <Label>Images</Label>
            <div className="grid grid-cols-3 gap-2">
              {/* Main (large) slot */}
              <label
                htmlFor="apt-img-main"
                className="col-span-2 h-44 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors"
              >
                <input id="apt-img-main" type="file" accept="image/*" className="sr-only" />
                <Plus className="h-6 w-6 text-gray-400" />
              </label>

              {/* Three small slots */}
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <label
                    key={i}
                    htmlFor={`apt-img-${i}`}
                    className="flex-1 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-orange-400 transition-colors"
                  >
                    <input id={`apt-img-${i}`} type="file" accept="image/*" className="sr-only" />
                    <Plus className="h-4 w-4 text-gray-400" />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-8">
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 text-base"
        >
          {isLoading ? "Registering..." : "Regist"}
        </Button>
      </div>
    </form>
  );
}
