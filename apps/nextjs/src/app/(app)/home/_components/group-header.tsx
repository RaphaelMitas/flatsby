"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";

import { useGroupContext } from "~/app/_components/context/group-context";
import { JoinWithCodeDialog } from "~/app/(app)/group/JoinWithCodeDialog";

const CREATE_GROUP_VALUE = "__create_group__";
const JOIN_GROUP_VALUE = "__join_group__";

export function GroupHeader() {
  const t = useTranslations("home");
  const tInvite = useTranslations("invite.join");
  const router = useRouter();
  const { currentGroup, groups, switchGroup } = useGroupContext();
  const [isSwitching, setIsSwitching] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  if (!currentGroup) {
    return null;
  }

  const handleValueChange = async (value: string) => {
    if (value === CREATE_GROUP_VALUE) {
      router.push("/group/create");
      return;
    }
    if (value === JOIN_GROUP_VALUE) {
      setJoinOpen(true);
      return;
    }

    const id = parseInt(value, 10);
    if (id === currentGroup.id) return;
    setIsSwitching(true);
    await switchGroup(id);
    setIsSwitching(false);
  };

  return (
    <div className="flex items-center gap-3">
      <Select
        value={String(currentGroup.id)}
        onValueChange={handleValueChange}
        disabled={isSwitching}
      >
        <SelectTrigger className="w-full border-none text-xl font-semibold shadow-none">
          <SelectValue>{currentGroup.name}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {groups.map((group) => (
            <SelectItem key={group.id} value={String(group.id)}>
              {group.name}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_GROUP_VALUE}>
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("createGroup")}
            </span>
          </SelectItem>
          <SelectItem value={JOIN_GROUP_VALUE}>
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {tInvite("withCode")}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Link
        href="/group/settings"
        className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md border shadow-sm"
      >
        <Settings className="h-4 w-4" />
      </Link>
      <JoinWithCodeDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}
