import type { DebtPerson } from "@flatsby/validators/expenses/formatting";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";
import { cn } from "~/lib/utils";

interface MemberAvatarProps {
  person: DebtPerson;
  className?: string;
  textClassName?: string;
}

export function MemberAvatar({
  person,
  className,
  textClassName,
}: MemberAvatarProps) {
  return (
    <Avatar className={className}>
      {person.image && <AvatarImage src={person.image} />}
      <AvatarFallback
        className={
          person.placeholder
            ? "bg-muted border-muted-foreground border border-dashed"
            : undefined
        }
        textClassName={cn(
          person.placeholder && "text-muted-foreground",
          textClassName,
        )}
      >
        {person.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
