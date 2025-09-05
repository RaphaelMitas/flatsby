import type { GroupMemberWithUserWithoutGroupId } from "@flatsby/validators";

import { Avatar, AvatarFallback, AvatarImage } from "@flatsby/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";

export const SplitGroupMemberSelect = ({
  value,
  onChange,
  groupMembers,
  availableGroupMembers,
}: {
  value: number;
  onChange: (value: number) => void;
  groupMembers: GroupMemberWithUserWithoutGroupId[];
  availableGroupMembers: GroupMemberWithUserWithoutGroupId[];
}) => {
  return (
    <Select
      value={value.toString()}
      onValueChange={(value) => onChange(Number(value))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select group member" />
      </SelectTrigger>
      <SelectContent>
        {groupMembers.map((groupMember) => (
          <SelectItem
            disabled={!availableGroupMembers.includes(groupMember)}
            key={groupMember.id}
            value={groupMember.id.toString()}
          >
            <div className="flex items-center gap-2 py-2">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  className="h-6 w-6"
                  src={groupMember.user.image ?? undefined}
                />
                <AvatarFallback className="h-6 w-6">
                  {groupMember.user.name.substring(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {groupMember.user.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
