import { ImageResponse } from "next/og";

import { ogImageSize, SiteOgCard } from "~/app/_components/landing/SiteOgCard";
import { loadInvite } from "./loadInvite";

export const size = ogImageSize;
export const contentType = "image/png";

// ImageResponse defaults to a year-long immutable cache, which would keep a reset invite's group on the card
const options = { ...size, headers: { "cache-control": "no-store" } };

const avatar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 9999,
};

const initials = (name: string) => name.substring(0, 2).toUpperCase();

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { preview } = await loadInvite((await params).code);
  if (!preview) return new ImageResponse(<SiteOgCard />, options);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4f4f5",
        color: "#18181b",
      }}
    >
      <div
        style={{
          ...avatar,
          width: 204,
          height: 204,
          fontSize: 77,
          background: "#18181b",
          color: "white",
        }}
      >
        {initials(preview.groupName)}
      </div>
      <div
        style={{
          display: "block",
          marginTop: 32,
          maxWidth: 1040,
          fontSize: 80,
          lineHeight: 1.1,
          textAlign: "center",
          lineClamp: 2,
        }}
      >
        {preview.groupName}
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 32 }}>
        {preview.members.map((member, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: names repeat and the public preview carries no ids
            key={i}
            style={{
              ...avatar,
              width: 96,
              height: 96,
              marginLeft: i === 0 ? 0 : -24,
              fontSize: 34,
              background: "#e4e4e7",
              border: "8px solid #f4f4f5",
            }}
          >
            {initials(member.name)}
          </div>
        ))}
        {/* Satori throws on a bare number child */}
        <div style={{ marginLeft: 24, fontSize: 41, color: "#52525b" }}>
          {String(preview.memberCount)}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 60,
          bottom: 53,
          fontSize: 36,
          color: "#71717a",
        }}
      >
        Flatsby
      </div>
    </div>,
    options,
  );
}
