import type { KeyTranslator } from "@flatsby/i18n/message-key";
import { useState } from "react";

import { translateIfKey } from "@flatsby/i18n/message-key";

import { newGroupFormSchema, splitFlatmateNames } from "./group";
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
  const [flatmates, setFlatmates] = useState("");
  const [issues, setIssues] = useState<
    { path: PropertyKey[]; message: string }[]
  >([]);
  const once = useOnce();

  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const groupName =
    editedGroupName ??
    (firstName
      ? t("group.onboarding.defaultGroupName", { name: firstName })
      : "");
  const names = splitFlatmateNames(flatmates);

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
      placeholders: names,
    });
    setIssues(parsed.error?.issues ?? []);
    if (!parsed.success || !(await keepName(parsed.data.name))) return;
    // The mutation shows its own failure
    await create({
      name: parsed.data.groupName,
      placeholders: parsed.data.placeholders ?? [],
    }).catch(() => undefined);
  });

  // Someone who lost their invite link joins from here, so this is their name step too
  const joinWithCode = once(async () => {
    const parsed = nameSchema.safeParse({ name: name.trim() });
    setIssues(parsed.error?.issues ?? []);
    if (parsed.success && (await keepName(parsed.data.name))) openJoin();
  });

  const issueFor = (field: Field) => {
    const message = issues.find(({ path }) => path[0] === field)?.message;
    return message === undefined ? undefined : translateIfKey(t, message);
  };

  return {
    name,
    setName,
    groupName,
    setGroupName,
    flatmates,
    setFlatmates,
    names,
    issueFor,
    submit,
    joinWithCode,
  };
}
