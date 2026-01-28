"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";

import { useGroupContext } from "~/app/_components/context/group-context";

export function GroupHeader() {
  const { currentGroup, groups, switchGroup } = useGroupContext();
  const [isSwitching, setIsSwitching] = useState(false);

  if (!currentGroup) {
    return null;
  }

  const handleGroupSwitch = async (newGroupId: string) => {
    const id = parseInt(newGroupId);
    if (id === currentGroup.id) return;
    setIsSwitching(true);
    await switchGroup(id);
    setIsSwitching(false);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <Select
        value={String(currentGroup.id)}
        onValueChange={handleGroupSwitch}
        disabled={isSwitching}
      >
        <SelectTrigger className="w-auto min-w-[150px] border-none text-xl font-semibold shadow-none">
          <SelectValue>{currentGroup.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectItem key={group.id} value={String(group.id)}>
              {group.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Link
        href="/group/settings"
        className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md border shadow-sm"
      >
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  );
}
