import { ImageResponse } from "next/og";
import { getLawyerBySlug } from "@/lib/db/queries/lawyers";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const lawyer = await getLawyerBySlug(slug);

  if (!lawyer) {
    return new Response("Lawyer not found", { status: 404 });
  }

  const rating = lawyer.averageRating ? parseFloat(lawyer.averageRating) : null;
  const location = [lawyer.city, lawyer.state].filter(Boolean).join(", ");
  const practiceAreaNames = lawyer.practiceAreas
    .slice(0, 3)
    .map((pa) => pa.practiceArea.name);

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
        </div>

        {/* Main Content */}
        <div
          style={{
            display: "flex",
            flex: 1,
            gap: "40px",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
            }}
          >
            {lawyer.photo ? (
              <img
                src={lawyer.photo}
                alt={lawyer.name}
                width={160}
                height={160}
                style={{
                  borderRadius: "80px",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: "160px",
                  height: "160px",
                  borderRadius: "80px",
                  backgroundColor: "#e5e5e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "56px",
                  fontWeight: "bold",
                  color: "#737373",
                }}
              >
                {lawyer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            {/* Name and badges */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "48px",
                  fontWeight: "bold",
                  color: "#1a1a1a",
                }}
              >
                {lawyer.name}
              </span>
              {lawyer.isVerified && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    backgroundColor: "#2563eb",
                    color: "#ffffff",
                    padding: "8px 16px",
                    borderRadius: "9999px",
                    fontSize: "20px",
                    fontWeight: "600",
                  }}
                >
                  Verified
                </div>
              )}
            </div>

            {/* Firm */}
            {lawyer.firmName && (
              <span
                style={{
                  fontSize: "28px",
                  color: "#525252",
                  marginTop: "8px",
                }}
              >
                {lawyer.firmName}
              </span>
            )}

            {/* Location */}
            {location && (
              <span
                style={{
                  fontSize: "24px",
                  color: "#737373",
                  marginTop: "8px",
                }}
              >
                {location}
              </span>
            )}

            {/* Practice Areas */}
            {practiceAreaNames.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "20px",
                  flexWrap: "wrap",
                }}
              >
                {practiceAreaNames.map((area) => (
                  <div
                    key={area}
                    style={{
                      backgroundColor: "#f5f5f5",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontSize: "20px",
                      color: "#525252",
                    }}
                  >
                    {area}
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
              {rating !== null && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "32px",
                      color: "#facc15",
                    }}
                  >
                    ★
                  </span>
                  <span
                    style={{
                      fontSize: "32px",
                      fontWeight: "bold",
                      color: "#1a1a1a",
                    }}
                  >
                    {rating.toFixed(1)}
                  </span>
                  <span
                    style={{
                      fontSize: "24px",
                      color: "#737373",
                    }}
                  >
                    ({lawyer.reviewCount} reviews)
                  </span>
                </div>
              )}
              {lawyer.yearsAtBar && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "32px",
                      fontWeight: "bold",
                      color: "#1a1a1a",
                    }}
                  >
                    {lawyer.yearsAtBar}
                  </span>
                  <span
                    style={{
                      fontSize: "24px",
                      color: "#737373",
                    }}
                  >
                    years at bar
                  </span>
                </div>
              )}
            </div>
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
            lawkita.my/lawyers/{slug}
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
