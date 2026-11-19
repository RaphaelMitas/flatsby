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
    setIssues(parsed.error?.issues ?? []);
    if (!parsed.success || !(await keepName(parsed.data.name))) return;
    await create({
      name: parsed.data.groupName,
      placeholders: parsed.data.placeholders ?? [],
    }).catch(() => undefined);
  });

  const joinWithCode = once(async () => {
    const parsed = nameSchema.safeParse({ name: name.trim() });
    setIssues(parsed.error?.issues ?? []);
    if (parsed.success && (await keepName(parsed.data.name))) openJoin();
  });

  const clearIssues = (field: Field) =>
    setIssues((all) => all.filter(({ path }) => path[0] !== field));

  const issueFor = (field: Field) => {
    const message = issues.find(({ path }) => path[0] === field)?.message;
    return message === undefined ? undefined : translateIfKey(t, message);
  };

  return {
    name,
    setName: (changed: string) => {
      setName(changed);
      clearIssues("name");
      if (editedGroupName === undefined) clearIssues("groupName");
    },
    groupName,
    setGroupName: (changed: string) => {
      setGroupName(changed);
      clearIssues("groupName");
    },
    names,
    addName: (added: string) => {
      setNames((all) => uniqueNames([...all, added]));
      clearIssues("placeholders");
    },
    removeName: (removed: string) => {
      setNames((all) => all.filter((name) => name !== removed));
      clearIssues("placeholders");
    },
    setDraft: (changed: string) => {
      setDraft(changed);
      clearIssues("placeholders");
    },
    issueFor,
    submit,
    joinWithCode,
  };
}
