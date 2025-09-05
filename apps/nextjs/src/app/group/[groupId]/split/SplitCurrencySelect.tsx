import type { Currency } from "@flatsby/validators";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@flatsby/ui/select";
import { currencySchema } from "@flatsby/validators";

export const SplitCurrencySelect = ({
  value,
  onChange,
}: {
  value: Currency;
  onChange: (value: Currency) => void;
}) => {
  const currencies = currencySchema.options;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-fit">
        <SelectValue placeholder="Select currency" />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency} value={currency}>
            {currency}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
