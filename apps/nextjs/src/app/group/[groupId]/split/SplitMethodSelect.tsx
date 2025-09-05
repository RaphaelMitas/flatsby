import type { SplitMethod } from "@flatsby/validators";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import { SplitMethodSchema } from "@flatsby/validators";

export const SplitMethodSelect = ({
  value,
  onChange,
}: {
  value: SplitMethod;
  onChange: (value: SplitMethod) => void;
}) => {
  const methods = SplitMethodSchema.options;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select method" />
      </SelectTrigger>
      <SelectContent>
        {methods.map((method) => (
          <SelectItem key={method} value={method}>
            {method}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
