import type React from "react";
import Link from "next/link";

import { UserAvatar } from "@flatsby/ui/user-avatar";

interface Props {
  link: string;
  groupName: string;
  memberCount: number;
  avatarSrc?: string;
}

const GroupsDashboardElement: React.FC<Props> = ({
  link,
  groupName,
  memberCount,
  avatarSrc,
}) => {
  return (
    <Link
      className="group bg-muted md:hover:bg-primary h-auto w-full items-center gap-4 rounded-lg p-4 shadow-sm"
      href={link}
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
    </Link>
  );
};

export default GroupsDashboardElement;
