import { ImageResponse } from "next/og";
import { getCaseBySlug } from "@/lib/db/queries/cases";

export const runtime = "edge";

const categoryColors: Record<string, { bg: string; text: string }> = {
  corruption: { bg: "#fee2e2", text: "#991b1b" },
  political: { bg: "#dbeafe", text: "#1e40af" },
  corporate: { bg: "#ede9fe", text: "#5b21b6" },
  criminal: { bg: "#ffedd5", text: "#9a3412" },
  constitutional: { bg: "#dcfce7", text: "#166534" },
  other: { bg: "#f3f4f6", text: "#374151" },
};

const statusLabels: Record<string, string> = {
  ongoing: "Ongoing",
  concluded: "Concluded",
  appeal: "Under Appeal",
};

const outcomeLabels: Record<string, string> = {
  guilty: "Guilty",
  not_guilty: "Not Guilty",
  settled: "Settled",
  dismissed: "Dismissed",
  ongoing: "Pending",
  other: "Other",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const caseData = await getCaseBySlug(slug);

  if (!caseData) {
    return new Response("Case not found", { status: 404 });
  }

  const categoryColor = categoryColors[caseData.category] || categoryColors.other;
  const tags = (caseData.tags as string[]) || [];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: "60px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#1a1a1a",
            }}
          >
            LawKita
          </div>
          <div
            style={{
              fontSize: "20px",
              color: "#737373",
            }}
          >
            Famous Cases Explorer
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          {/* Badges */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                backgroundColor: categoryColor.bg,
                color: categoryColor.text,
                padding: "8px 16px",
                borderRadius: "9999px",
                fontSize: "18px",
                fontWeight: "600",
              }}
            >
              {caseData.category.charAt(0).toUpperCase() + caseData.category.slice(1)}
            </div>
            <div
              style={{
                display: "flex",
                backgroundColor: "#f5f5f5",
                color: "#525252",
                padding: "8px 16px",
                borderRadius: "9999px",
                fontSize: "18px",
              }}
            >
              {statusLabels[caseData.status]}
            </div>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "52px",
              fontWeight: "bold",
              color: "#1a1a1a",
              lineHeight: 1.2,
              marginBottom: "16px",
              maxWidth: "900px",
            }}
          >
            {caseData.title}
          </h1>

          {/* Subtitle */}
          {caseData.subtitle && (
            <p
              style={{
                fontSize: "28px",
                color: "#525252",
                marginBottom: "24px",
              }}
            >
              {caseData.subtitle}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "24px",
              }}
            >
              {tags.slice(0, 5).map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    backgroundColor: "#f5f5f5",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "16px",
                    color: "#525252",
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div
            style={{
              display: "flex",
              gap: "40px",
              marginTop: "auto",
            }}
          >
            {caseData.outcome && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    color: "#737373",
                  }}
                >
                  Verdict
                </span>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#1a1a1a",
                  }}
                >
                  {outcomeLabels[caseData.outcome]}
                </span>
              </div>
            )}
            {caseData.lawyers.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    color: "#737373",
                  }}
                >
                  Lawyers
                </span>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#1a1a1a",
                  }}
                >
                  {caseData.lawyers.length}
                </span>
              </div>
            )}
            {caseData.timeline.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    color: "#737373",
                  }}
                >
                  Timeline Events
                </span>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: "bold",
                    color: "#1a1a1a",
                  }}
                >
                  {caseData.timeline.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: "2px solid #e5e5e5",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              color: "#737373",
            }}
          >
            lawkita.my/cases/{slug}
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#737373",
            }}
          >
            Malaysia Lawyer Directory
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
