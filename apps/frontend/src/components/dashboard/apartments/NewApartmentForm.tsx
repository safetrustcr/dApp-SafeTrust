"use client";

import React, { useState } from "react";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Plus, ArrowLeft } from "lucide-react";

export function NewApartmentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    address: "",
    price: "",
    bedrooms: "1",
    bathrooms: "1",
    description: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSelectChange = (key: string, value: string) => {
    setFormData({
      ...formData,
      [key]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API registration on PostgreSQL & Stellar trust mirror
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    }, 1200);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full animate-bounce">
          <ShieldCheck className="h-12 w-12" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Apartment Registered Successfully!</h3>
          <p className="text-sm text-slate-500 mt-1">
            Your listing has been synced with the Hasura GraphQL API and mapped to safe escrow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">List a New Property</h2>
          <p className="text-xs text-slate-400">Add property specifics to configure secure single-release security deposit escrows.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Listing Title</Label>
            <Input
              id="name"
              placeholder="e.g. Cozy Oceanfront Apartment"
              required
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Monthly Rent (USDC)</Label>
            <Input
              id="price"
              type="number"
              placeholder="e.g. 1500"
              required
              value={formData.price}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Region / City</Label>
            <Select
              value={formData.location}
              onValueChange={(v) => handleSelectChange("location", v)}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cr">Costa Rica</SelectItem>
                <SelectItem value="us">United States</SelectItem>
                <SelectItem value="mx">Mexico</SelectItem>
                <SelectItem value="es">Spain</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Full Address</Label>
            <Input
              id="address"
              placeholder="e.g. 329 Calle Santos, Paseo Colón"
              required
              value={formData.address}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Select
              value={formData.bedrooms}
              onValueChange={(v) => handleSelectChange("bedrooms", v)}
            >
              <SelectTrigger id="bedrooms">
                <SelectValue placeholder="Bedrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Bed</SelectItem>
                <SelectItem value="2">2 Beds</SelectItem>
                <SelectItem value="3">3 Beds</SelectItem>
                <SelectItem value="4">4+ Beds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Select
              value={formData.bathrooms}
              onValueChange={(v) => handleSelectChange("bathrooms", v)}
            >
              <SelectTrigger id="bathrooms">
                <SelectValue placeholder="Bathrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Bath</SelectItem>
                <SelectItem value="2">2 Baths</SelectItem>
                <SelectItem value="3">3+ Baths</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Listing Description</Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="Write a clear and engaging description for tenants..."
            required
            value={formData.description}
            onChange={handleChange}
          />
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
            {loading ? "Registering..." : (
              <>
                <Plus className="h-4 w-4" /> Register Property
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
