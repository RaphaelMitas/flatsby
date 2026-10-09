import { ImageResponse } from "next/og";

import { FREE_ON, HEADLINE } from "./_components/landing/content";

export const alt = "Flatsby: shared shopping lists and bill splitting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "white",
        color: "black",
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 600 }}>Flatsby</div>
      <div style={{ fontSize: 72, fontWeight: 700, marginTop: 24 }}>
        {HEADLINE}
      </div>
      <div style={{ fontSize: 32, marginTop: 32, color: "#555" }}>
        {FREE_ON}
      </div>
    </div>,
    size,
  );
}
