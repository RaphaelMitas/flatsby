"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";

import HomeIcon from "@flatsby/ui/custom/icons/HomeIcon";

export function HomeLink() {
  const segments = useSelectedLayoutSegments();

  // Get groupId from segments
  const groupIndex = segments.indexOf("group") + 1;
  const currentGroupId = segments[groupIndex]
    ? parseInt(segments[groupIndex])
    : null;

  // Navigate directly to the current group, or to /group if no group is selected
  const href = currentGroupId ? `/group/${currentGroupId}` : "/group";

  return (
    <Link className="flex items-center gap-2" href={href}>
      <HomeIcon className="text-primary h-6 w-10" />
      <span className="hidden text-lg font-bold md:block">Flatsby</span>
    </Link>
  );
}
