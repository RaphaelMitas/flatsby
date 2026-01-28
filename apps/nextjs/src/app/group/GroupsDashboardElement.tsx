"use client";

import { UserAvatar } from "@flatsby/ui/user-avatar";

interface Props {
  groupId: number;
  groupName: string;
  memberCount: number;
  avatarSrc?: string;
  onSelect: (groupId: number) => void;
  disabled?: boolean;
}

export function GroupsDashboardElement({
  groupId,
  groupName,
  memberCount,
  avatarSrc,
  onSelect,
  disabled,
}: Props) {
  return (
    <button
      type="button"
      className="group bg-muted md:hover:bg-primary h-auto w-full items-center gap-4 rounded-lg p-4 text-left shadow-sm disabled:opacity-50"
      onClick={() => onSelect(groupId)}
      disabled={disabled}
    >
      <div className="flex items-center gap-3">
        <UserAvatar name={groupName} image={avatarSrc} size="md" />
        <div className="flex-1">
          <h3 className="md:group-hover:text-primary-foreground text-sm font-semibold tracking-tight">
            {groupName}
          </h3>
          <p className="text-muted-foreground text-xs">
            {memberCount === 1
              ? `${memberCount} member`
              : `${memberCount} members`}
          </p>
        </div>
      </div>
    </button>
  );
}
