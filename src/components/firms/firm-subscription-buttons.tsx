"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface FirmSubscriptionButtonsProps {
  firmId: string;
}

export function FirmSubscriptionButtons({ firmId }: FirmSubscriptionButtonsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState("");

  const handleSubscribe = async (billingPeriod: "monthly" | "annual") => {
    setLoading(billingPeriod);
    setError("");

    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "firm_premium",
          billingPeriod,
          firmId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Button
          onClick={() => handleSubscribe("monthly")}
          disabled={loading !== null}
          className="w-full"
          variant="outline"
        >
          {loading === "monthly" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              RM 499/month
            </>
          )}
        </Button>
        <Button
          onClick={() => handleSubscribe("annual")}
          disabled={loading !== null}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {loading === "annual" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              RM 4,990/year <span className="text-xs ml-1">(Save 17%)</span>
            </>
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </div>
  );
}
