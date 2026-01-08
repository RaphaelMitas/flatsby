"use client";

import type { GroupMemberInfo } from "@flatsby/validators/chat/tools";

import { Button } from "@flatsby/ui/button";
import { UserAvatar } from "@flatsby/ui/user-avatar";

interface MemberSelectorProps {
  members: GroupMemberInfo[];
  context?: "payer" | "split";
  onSelect: (member: GroupMemberInfo) => void;
  disabled?: boolean;
}

export function MemberSelector({
  members,
  context,
  onSelect,
  disabled,
}: MemberSelectorProps) {
  const promptText = context === "payer" ? "Who paid?" : "Select a member:";

  return (
    <div className="my-2">
      <p className="text-muted-foreground mb-2 text-sm">{promptText}</p>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <Button
            key={member.id}
            variant="outline"
            size="sm"
            className="h-auto gap-2 px-3 py-1.5"
            onClick={() => onSelect(member)}
            disabled={disabled}
          >
            <UserAvatar name={member.name} image={member.image} size="xs" />
            <span>{member.name}</span>
            {member.isCurrentUser && (
              <span className="text-muted-foreground">(you)</span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
