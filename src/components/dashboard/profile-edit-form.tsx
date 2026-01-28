"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X } from "lucide-react";

interface PracticeArea {
  id: string;
  name: string;
  slug: string;
}

interface LawyerPracticeArea {
  practiceArea: PracticeArea;
  experienceLevel: string | null;
}

interface Lawyer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  firmName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  practiceAreas: LawyerPracticeArea[];
}

interface ProfileEditFormProps {
  lawyer: Lawyer;
  allPracticeAreas: PracticeArea[];
}

export function ProfileEditForm({ lawyer, allPracticeAreas }: ProfileEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: lawyer.name,
    email: lawyer.email || "",
    phone: lawyer.phone || "",
    bio: lawyer.bio || "",
    firmName: lawyer.firmName || "",
    address: lawyer.address || "",
    city: lawyer.city || "",
    state: lawyer.state || "",
  });
  const [selectedPracticeAreas, setSelectedPracticeAreas] = useState<string[]>(
    lawyer.practiceAreas.map((pa) => pa.practiceArea.id)
  );

  // Track if form has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    const originalPracticeAreas = lawyer.practiceAreas.map((pa) => pa.practiceArea.id);
    const practiceAreasChanged =
      selectedPracticeAreas.length !== originalPracticeAreas.length ||
      selectedPracticeAreas.some((id) => !originalPracticeAreas.includes(id));

    return (
      formData.name !== lawyer.name ||
      formData.email !== (lawyer.email || "") ||
      formData.phone !== (lawyer.phone || "") ||
      formData.bio !== (lawyer.bio || "") ||
      formData.firmName !== (lawyer.firmName || "") ||
      formData.address !== (lawyer.address || "") ||
      formData.city !== (lawyer.city || "") ||
      formData.state !== (lawyer.state || "") ||
      practiceAreasChanged
    );
  }, [formData, selectedPracticeAreas, lawyer]);

  // Warn about unsaved changes on page leave
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/lawyers/${lawyer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          practiceAreaIds: selectedPracticeAreas,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePracticeArea = (id: string) => {
    setSelectedPracticeAreas((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Your name and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                required
                autoComplete="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firmName">Law Firm Name</Label>
              <Input
                id="firmName"
                value={formData.firmName}
                onChange={(e) => setFormData({ ...formData, firmName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio / About</Label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell potential clients about yourself, your experience, and your approach..."
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Where clients can find you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Office Address</Label>
            <Input
              id="address"
              autoComplete="street-address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Practice Areas */}
      <Card>
        <CardHeader>
          <CardTitle>Practice Areas</CardTitle>
          <CardDescription>
            Select the areas of law you practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Practice areas">
            {allPracticeAreas.map((area) => {
              const isSelected = selectedPracticeAreas.includes(area.id);
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => togglePracticeArea(area.id)}
                  aria-pressed={isSelected}
                  className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full"
                >
                  <Badge
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                  >
                    {area.name}
                    {isSelected && <X className="ml-1 h-3 w-3" aria-hidden="true" />}
                  </Badge>
                </button>
              );
            })}
          </div>
          {selectedPracticeAreas.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Click on practice areas above to select them
            </p>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" aria-hidden="true" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
