import { Badge } from "@/components/ui/badge";

interface DirectoryDetailsSectionProps {
  qualification: string | null;
  languages: string[] | null;
  credentials: string[] | null;
  rankings: string[] | null;
}

/**
 * Facts carried over from public directories and registers: qualification,
 * languages, panel memberships and published rankings. Renders nothing when
 * the profile has none of them.
 */
export function DirectoryDetailsSection({
  qualification,
  languages,
  credentials,
  rankings,
}: DirectoryDetailsSectionProps) {
  const hasLanguages = (languages?.length ?? 0) > 0;
  const hasCredentials = (credentials?.length ?? 0) > 0;
  const hasRankings = (rankings?.length ?? 0) > 0;
  if (!qualification && !hasLanguages && !hasCredentials && !hasRankings) return null;

  return (
    <section className="space-y-5" aria-labelledby="directory-details-heading">
      <h2 id="directory-details-heading" className="text-xl font-semibold">
        Credentials
      </h2>

      {qualification && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Qualification</h3>
          <p className="mt-1">{qualification}</p>
        </div>
      )}

      {hasCredentials && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Panels and appointments
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {credentials!.map((credential) => (
              <Badge key={credential} variant="secondary">
                {credential}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasLanguages && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">Languages</h3>
          <p className="mt-1">{languages!.join(", ")}</p>
        </div>
      )}

      {hasRankings && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">
            Published rankings
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {rankings!.map((ranking) => (
              <li key={ranking}>{ranking}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            As published by the named legal guide. LawKita does not rank lawyers.
          </p>
        </div>
      )}
    </section>
  );
}
