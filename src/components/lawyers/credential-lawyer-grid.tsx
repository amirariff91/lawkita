import { MapPin, Phone } from "lucide-react";
import { LawyerCard } from "./lawyer-card";
import type { LawyerCardData } from "@/types/lawyer";

export type CredentialLawyerGridItem = LawyerCardData & {
  address: string | null;
  phone: string | null;
};

interface CredentialLawyerGridProps {
  lawyers: CredentialLawyerGridItem[];
  emptyMessage: string;
}

/**
 * The standard lawyer card plus the office address and phone number, which
 * is what someone looking for a commissioner for oaths or notary nearby
 * needs. Contact details sit outside the card's link so the phone number can
 * be its own `tel:` link.
 */
export function CredentialLawyerGrid({ lawyers, emptyMessage }: CredentialLawyerGridProps) {
  if (lawyers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground max-w-md">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lawyers.map((lawyer) => {
        const address = lawyer.address?.trim();
        const phone = lawyer.phone?.trim();
        return (
          <li key={lawyer.id} className="flex flex-col gap-2">
            <LawyerCard lawyer={lawyer} />
            {(address || phone) && (
              <div className="space-y-1 px-1 text-sm text-muted-foreground">
                {address && (
                  <p className="flex items-start gap-1.5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span>{address}</span>
                  </p>
                )}
                {phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                    <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="hover:text-foreground">
                      {phone}
                    </a>
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
