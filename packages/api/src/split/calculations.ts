import type { CreateExpenseInput } from "@flatsby/validators";

interface ParticipantShare {
  groupMemberId: number;
  owedAmountCents: number;
  rawValue?: number;
}

export function calculateOwedAmounts({
  participants,
  splitMethod,
  totalAmountCents,
}: Pick<
  CreateExpenseInput,
  "participants" | "splitMethod" | "totalAmountCents"
>): ParticipantShare[] {
  if (participants.length === 0) return [];

  switch (splitMethod) {
    case "equal": {
      const per = Math.floor(totalAmountCents / participants.length);
      let remainder = totalAmountCents - per * participants.length;
      return participants.map((p) => {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder -= 1;
        return {
          groupMemberId: p.groupMemberId,
          owedAmountCents: per + extra,
          rawValue: undefined,
        };
      });
    }
    case "exact": {
      return participants.map((p) => ({
        groupMemberId: p.groupMemberId,
        owedAmountCents: p.value ?? 0,
        rawValue: p.value,
      }));
    }
    case "percent": {
      // value is basis points (0..10000)
      const raw = participants.map((p) => {
        const bps = p.value ?? 0;
        const exact = (totalAmountCents * bps) / 10000;
        const base = Math.floor(exact);
        const frac = exact - base;
        return { p, base, frac };
      });
      const baseSum = raw.reduce((s, r) => s + r.base, 0);
      let remainder = totalAmountCents - baseSum;
      raw.sort((a, b) => b.frac - a.frac);
      return raw.map((r) => {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder -= 1;
        return {
          groupMemberId: r.p.groupMemberId,
          owedAmountCents: r.base + extra,
          rawValue: r.p.value,
        };
      });
    }
    case "shares": {
      const totalShares = participants.reduce((s, p) => s + (p.value ?? 0), 0);
      if (totalShares <= 0) {
        return participants.map((p) => ({
          groupMemberId: p.groupMemberId,
          owedAmountCents: 0,
          rawValue: p.value,
        }));
      }
      // compute floor and distribute remainder by largest fractional parts
      const raw = participants.map((p) => {
        const shares = p.value ?? 0;
        const exact = (totalAmountCents * shares) / totalShares;
        const base = Math.floor(exact);
        const frac = exact - base;
        return { p, base, frac };
      });
      const baseSum = raw.reduce((s, r) => s + r.base, 0);
      let remainder = totalAmountCents - baseSum;
      raw.sort((a, b) => b.frac - a.frac);
      return raw.map((r) => {
        const extra = remainder > 0 ? 1 : 0;
        if (remainder > 0) remainder -= 1;
        return {
          groupMemberId: r.p.groupMemberId,
          owedAmountCents: r.base + extra,
          rawValue: r.p.value,
        };
      });
    }
  }
}
