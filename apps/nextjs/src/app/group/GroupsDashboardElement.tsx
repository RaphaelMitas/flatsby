import type React from "react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";

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
      className="group h-auto w-full items-center gap-4 rounded-lg bg-muted p-4 shadow-sm md:hover:bg-primary"
      href={link}
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage alt="Group Avatar" src={avatarSrc} />
          <AvatarFallback>{groupName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-sm font-semibold tracking-tight md:group-hover:text-primary-foreground">
            {groupName}
          </h3>
          <p className="text-xs text-muted-foreground">
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
