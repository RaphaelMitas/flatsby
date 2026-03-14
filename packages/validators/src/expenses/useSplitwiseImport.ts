import type { CurrencyCode } from "./types";
import type {
  ParsedSplitwiseResult,
  SkippedRow,
  TransformedExpense,
} from "./splitwise-import";
import { useCallback, useState } from "react";

import { parseSplitwiseCsv, transformSplitwiseRows } from "./splitwise-import";

type WizardStep = "file" | "mapping" | "preview" | "confirm";

interface WizardState {
  step: WizardStep;
  csvText: string | null;
  parsed: ParsedSplitwiseResult | null;
  currency: CurrencyCode;
  memberMapping: Record<string, number>;
  expenses: TransformedExpense[];
  skipped: SkippedRow[];
}

export function useSplitwiseImport() {
  const [state, setState] = useState<WizardState>({
    step: "file",
    csvText: null,
    parsed: null,
    currency: "EUR",
    memberMapping: {},
    expenses: [],
    skipped: [],
  });

  const setCurrency = useCallback((currency: CurrencyCode) => {
    setState((s) => ({ ...s, currency }));
  }, []);

  const handleFileLoad = useCallback((text: string) => {
    const parsed = parseSplitwiseCsv(text);
    setState((s) => ({
      ...s,
      csvText: text,
      parsed,
      memberMapping: {},
    }));
  }, []);

  const setMemberMapping = useCallback(
    (splitwiseName: string, groupMemberId: number) => {
      setState((s) => ({
        ...s,
        memberMapping: { ...s.memberMapping, [splitwiseName]: groupMemberId },
      }));
    },
    [],
  );

  const allNamesMapped =
    state.parsed !== null &&
    state.parsed.personNames.length > 0 &&
    state.parsed.personNames.every((name) => state.memberMapping[name] != null);

  const goToMapping = useCallback(() => {
    setState((s) => ({ ...s, step: "mapping" }));
  }, []);

  const goToPreview = useCallback(() => {
    if (!state.parsed) return;
    const result = transformSplitwiseRows(state.parsed.rows, {
      targetCurrency: state.currency,
      memberMapping: state.memberMapping,
    });
    setState((s) => ({
      ...s,
      step: "preview",
      expenses: result.expenses,
      skipped: result.skipped,
    }));
  }, [state.parsed, state.currency, state.memberMapping]);

  const goToConfirm = useCallback(() => {
    setState((s) => ({ ...s, step: "confirm" }));
  }, []);

  const goBack = useCallback(() => {
    setState((s) => {
      switch (s.step) {
        case "mapping":
          return { ...s, step: "file" };
        case "preview":
          return { ...s, step: "mapping" };
        case "confirm":
          return { ...s, step: "preview" };
        default:
          return s;
      }
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      step: "file",
      csvText: null,
      parsed: null,
      currency: "EUR",
      memberMapping: {},
      expenses: [],
      skipped: [],
    });
  }, []);

  return {
    ...state,
    setCurrency,
    handleFileLoad,
    setMemberMapping,
    allNamesMapped,
    goToMapping,
    goToPreview,
    goToConfirm,
    goBack,
    reset,
  };
}
