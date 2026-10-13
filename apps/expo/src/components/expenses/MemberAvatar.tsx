import type { DebtPerson } from "@flatsby/validators/expenses/formatting";

import { Avatar, AvatarFallback, AvatarImage } from "~/lib/ui/avatar";

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
      <AvatarFallback textClassName={textClassName}>
        {person.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
