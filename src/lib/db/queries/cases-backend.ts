export type CasesQueryBackend = "legacy" | "postgres";

type CasesEnvironment = Partial<
  Record<
    | "LEGACY_CASES_URL"
    | "LEGACY_CASES_ANON_KEY"
    | "NEXT_PUBLIC_SUPABASE_URL"
    | "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    | "CASES_QUERY_BACKEND",
    string
  >
>;

export function getLegacyCasesConfiguration(
  environment: CasesEnvironment = process.env as CasesEnvironment
): { url: string; key: string } | null {
  const dedicatedUrl = environment.LEGACY_CASES_URL;
  const dedicatedKey = environment.LEGACY_CASES_ANON_KEY;
  if (dedicatedUrl || dedicatedKey) {
    if (!dedicatedUrl || !dedicatedKey) {
      throw new Error(
        "Legacy cases queries require both LEGACY_CASES_URL and LEGACY_CASES_ANON_KEY"
      );
    }
    return { url: dedicatedUrl.replace(/\/+$/, ""), key: dedicatedKey };
  }

  const fallbackUrl = environment.NEXT_PUBLIC_SUPABASE_URL;
  const fallbackKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!fallbackUrl && !fallbackKey) return null;
  if (!fallbackUrl || !fallbackKey) {
    throw new Error(
      "Legacy cases queries require both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return { url: fallbackUrl.replace(/\/+$/, ""), key: fallbackKey };
}

export function resolveCasesQueryBackend(
  environment: CasesEnvironment = process.env as CasesEnvironment
): CasesQueryBackend {
  if (environment.CASES_QUERY_BACKEND === "postgres") return "postgres";
  if (
    environment.CASES_QUERY_BACKEND &&
    environment.CASES_QUERY_BACKEND !== "legacy"
  ) {
    throw new Error("CASES_QUERY_BACKEND must be either legacy or postgres");
  }

  if (getLegacyCasesConfiguration(environment)) return "legacy";
  throw new Error(
    "Legacy cases queries are not configured. Set legacy cases credentials, or explicitly opt into the self-hosted path with CASES_QUERY_BACKEND=postgres."
  );
}
