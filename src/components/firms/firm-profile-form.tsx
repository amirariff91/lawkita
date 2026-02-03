"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, AlertCircle, Upload, X, Building2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import type { FirmDashboardData } from "@/lib/db/queries/firms";

interface FirmProfileFormProps {
  firm: FirmDashboardData;
}

type FormStatus = "idle" | "submitting" | "success" | "error";

export function FirmProfileForm({ firm }: FirmProfileFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: firm.name,
    description: firm.description || "",
    address: firm.address || "",
    state: firm.state || "",
    city: firm.city || "",
    phone: firm.phone || "",
    email: firm.email || "",
    website: firm.website || "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(firm.logo);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(file.type)) {
        setErrorMessage("Please upload a JPG, PNG, or WebP image");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Image size must be less than 5MB");
        return;
      }
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
      setErrorMessage("");
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logo) return firm.logo;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Storage not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const fileExt = logo.name.split(".").pop();
    const fileName = `firms/${firm.id}/logo.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(fileName, logo, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      throw new Error("Failed to upload logo: " + error.message);
    }

    const { data: urlData } = supabase.storage.from("images").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      // Upload logo if changed
      let logoUrl = firm.logo;
      if (logo) {
        logoUrl = await uploadLogo();
      }

      const response = await fetch(`/api/firms/${firm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          logo: logoUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      setStatus("success");
      router.refresh();

      // Reset success status after 3 seconds
      setTimeout(() => {
        setStatus("idle");
      }, 3000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo Upload */}
      <div className="space-y-2">
        <Label>Firm Logo</Label>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Firm logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {logoPreview ? "Change Logo" : "Upload Logo"}
            </Button>
            {logo && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLogo(null);
                  setLogoPreview(firm.logo);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              JPG, PNG, or WebP. Max 5MB. Square recommended.
            </p>
          </div>
        </div>
      </div>

      {/* Firm Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Firm Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Tell potential clients about your firm..."
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Brief overview of your firm, areas of expertise, and what sets you apart.
        </p>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Full office address"
          rows={2}
        />
      </div>

      {/* City & State */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="e.g., Kuala Lumpur"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            placeholder="e.g., Selangor"
          />
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="e.g., 03-1234 5678"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="e.g., info@lawfirm.com.my"
          />
        </div>
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="e.g., https://www.lawfirm.com.my"
        />
      </div>

      {/* Status Messages */}
      {status === "error" && (
        <div role="alert" className="flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}

      {status === "success" && (
        <div role="status" className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          Profile updated successfully
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </form>
  );
}
