"use client";

import Link from "next/link";

import HomeIcon from "@flatsby/ui/custom/icons/HomeIcon";

export function HomeLink() {
  return (
    <Link className="flex items-center gap-2" href="/home">
      <HomeIcon className="text-primary h-6 w-10" />
      <span className="hidden text-lg font-bold md:block">Flatsby</span>
    </Link>
  );
}
