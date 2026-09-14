"use client";

import Link from "next/link";

import FlatsbyCat from "@flatsby/ui/custom/icons/FlatsbyCat";

export function HomeLink() {
  return (
    <Link className="flex items-center gap-2" href="/home">
      <FlatsbyCat />
      <span className="hidden text-lg font-bold md:block">Flatsby</span>
    </Link>
  );
}
