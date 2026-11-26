import { ImageResponse } from "next/og";

// Default share image for every page that does not set its own (lawyer and
// case pages do). Without one, links shared on WhatsApp and social apps show
// no preview image.
export const alt = "LawKita, the Malaysian lawyer and law firm directory";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#112238",
          color: "#ffffff",
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-2px" }}>LawKita</div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#c9d6e8" }}>
          Find lawyers and law firms across Malaysia
        </div>
        <div style={{ fontSize: 28, marginTop: 48, color: "#8fa6c4" }}>lawkita.com</div>
      </div>
    ),
    size
  );
}
