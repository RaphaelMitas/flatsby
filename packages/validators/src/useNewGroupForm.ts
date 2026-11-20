import type { KeyTranslator } from "@flatsby/i18n/message-key";
import { useState } from "react";

import { translateIfKey } from "@flatsby/i18n/message-key";

import { newGroupFormSchema, uniqueNames } from "./group";
import { useOnce } from "./useOnce";

type Field = "name" | "groupName" | "placeholders";

const nameSchema = newGroupFormSchema.pick({ name: true });

export function useNewGroupForm({
  t,
  initialName,
  savedName,
  saveName,
  create,
  openJoin,
}: {
  t: KeyTranslator;
  initialName: string;
  savedName: string;
  saveName: (name: string) => Promise<{ success: boolean }>;
  create: (group: { name: string; placeholders: string[] }) => Promise<unknown>;
  openJoin: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [editedGroupName, setGroupName] = useState<string>();
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const once = useOnce();

  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const groupName =
    editedGroupName ??
    (firstName
      ? t("group.onboarding.defaultGroupName", { name: firstName })
      : "");

  const values = {
    name,
    groupName,
    placeholders: [...names, draft].join("\n"),
  } satisfies Record<Field, string>;
  const [checked, setChecked] = useState<{
    values: typeof values;
    issues: { path: PropertyKey[]; message: string }[];
  }>();

  const keepName = async (trimmed: string) =>
    trimmed === savedName ||
    (await saveName(trimmed).then(
      ({ success }) => success,
      () => false,
    ));

  const submit = once(async () => {
    const parsed = newGroupFormSchema.safeParse({
      name: name.trim(),
      groupName: groupName.trim(),
      placeholders: uniqueNames([...names, draft.trim()].filter(Boolean)),
    });
    setChecked({ values, issues: parsed.error?.issues ?? [] });
    if (!parsed.success || !(await keepName(parsed.data.name))) return;
    await create({
      name: parsed.data.groupName,
      placeholders: parsed.data.placeholders ?? [],
    }).catch(() => undefined);
  });

  const joinWithCode = once(async () => {
    const parsed = nameSchema.safeParse({ name: name.trim() });
    setChecked({ values, issues: parsed.error?.issues ?? [] });
    if (parsed.success && (await keepName(parsed.data.name))) openJoin();
  });

  const issueFor = (field: Field) => {
    if (checked?.values[field] !== values[field]) return undefined;
    const message = checked.issues.find(
      ({ path }) => path[0] === field,
    )?.message;
    return message === undefined ? undefined : translateIfKey(t, message);
  };

  return {
    name,
    setName,
    groupName,
    setGroupName,
    names,
    addName: (added: string) => setNames((all) => uniqueNames([...all, added])),
    removeName: (removed: string) =>
      setNames((all) => all.filter((name) => name !== removed)),
    setDraft,
    issueFor,
    submit,
    joinWithCode,
  };
}
