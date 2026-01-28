"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, ExternalLink, Trash2 } from "lucide-react";

interface Lawyer {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  barMembershipNumber: string | null;
  barStatus: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  firmName: string | null;
  isVerified: boolean;
  isClaimed: boolean;
  isActive: boolean;
  subscriptionTier: string;
  yearsAtBar: number | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminLawyerEditPage({ params }: PageProps) {
  const router = useRouter();
  const [lawyer, setLawyer] = useState<Lawyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then((p) => {
      fetchLawyer(p.id);
    });
  }, [params]);

  async function fetchLawyer(id: string) {
    try {
      const response = await fetch(`/api/admin/lawyers/${id}`);
      if (response.ok) {
        const data = await response.json();
        setLawyer(data.lawyer);
      }
    } catch (error) {
      console.error("Failed to fetch lawyer:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!lawyer) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/lawyers/${lawyer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lawyer),
      });

      if (response.ok) {
        router.push("/admin/content/lawyers");
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to save");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!lawyer) return;
    if (!confirm("Are you sure you want to delete this lawyer profile? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/lawyers/${lawyer.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/admin/content/lawyers");
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Lawyer not found</p>
        <Link href="/admin/content/lawyers" className="text-primary hover:underline mt-2 inline-block">
          Back to lawyers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/content/lawyers">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Lawyer</h1>
          <p className="text-muted-foreground">{lawyer.name}</p>
        </div>
        <Link href={`/lawyers/${lawyer.slug}`} target="_blank">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={lawyer.name}
                  onChange={(e) => setLawyer({ ...lawyer, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={lawyer.slug}
                  onChange={(e) => setLawyer({ ...lawyer, slug: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={lawyer.email || ""}
                  onChange={(e) => setLawyer({ ...lawyer, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={lawyer.phone || ""}
                  onChange={(e) => setLawyer({ ...lawyer, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={lawyer.bio || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLawyer({ ...lawyer, bio: e.target.value })}
                rows={4}
              />
            </div>
          </div>

          {/* Bar Information */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Bar Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="barMembershipNumber">Bar Membership Number</Label>
                <Input
                  id="barMembershipNumber"
                  value={lawyer.barMembershipNumber || ""}
                  onChange={(e) => setLawyer({ ...lawyer, barMembershipNumber: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="barStatus">Bar Status</Label>
                <Select
                  value={lawyer.barStatus || "active"}
                  onValueChange={(value) => setLawyer({ ...lawyer, barStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="deceased">Deceased</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="yearsAtBar">Years at Bar</Label>
                <Input
                  id="yearsAtBar"
                  type="number"
                  value={lawyer.yearsAtBar || ""}
                  onChange={(e) =>
                    setLawyer({ ...lawyer, yearsAtBar: e.target.value ? parseInt(e.target.value) : null })
                  }
                />
              </div>
              <div>
                <Label htmlFor="firmName">Firm Name</Label>
                <Input
                  id="firmName"
                  value={lawyer.firmName || ""}
                  onChange={(e) => setLawyer({ ...lawyer, firmName: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Location</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={lawyer.state || ""}
                  onChange={(e) => setLawyer({ ...lawyer, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={lawyer.city || ""}
                  onChange={(e) => setLawyer({ ...lawyer, city: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={lawyer.address || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLawyer({ ...lawyer, address: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Status</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={lawyer.isActive}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setLawyer({ ...lawyer, isActive: checked === true })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isVerified"
                  checked={lawyer.isVerified}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setLawyer({ ...lawyer, isVerified: checked === true })
                  }
                />
                <Label htmlFor="isVerified">Verified</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isClaimed"
                  checked={lawyer.isClaimed}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setLawyer({ ...lawyer, isClaimed: checked === true })
                  }
                />
                <Label htmlFor="isClaimed">Claimed</Label>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Subscription</h2>
            <Select
              value={lawyer.subscriptionTier}
              onValueChange={(value) => setLawyer({ ...lawyer, subscriptionTier: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium (RM199/mo)</SelectItem>
                <SelectItem value="featured">Featured (RM399/mo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="rounded-lg border bg-background p-6">
            <h2 className="font-semibold mb-4">Actions</h2>
            <div className="space-y-2">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lawyer
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
