import type { KeyTranslator } from "@flatsby/i18n/message-key";
import { useState } from "react";

import { translateIfKey } from "@flatsby/i18n/message-key";

import { newGroupFormSchema, splitFlatmateNames } from "./group";
import { userNameSchema } from "./user";

type Field = "name" | "groupName" | "placeholders";

/** The onboarding screen's fields and rules; each client brings its own mutations and markup. */
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
  saveName: (name: string) => Promise<boolean>;
  create: (group: { name: string; placeholders: string[] }) => void;
  openJoin: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [editedGroupName, setGroupName] = useState<string>();
  const [flatmates, setFlatmates] = useState("");
  const [issues, setIssues] = useState<
    { path: PropertyKey[]; message: string }[]
  >([]);

  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const groupName =
    editedGroupName ??
    (firstName
      ? t("group.onboarding.defaultGroupName", { name: firstName })
      : "");
  const names = splitFlatmateNames(flatmates);

  const keepName = async (trimmed: string) =>
    trimmed === savedName || (await saveName(trimmed));

  const submit = async () => {
    const parsed = newGroupFormSchema.safeParse({
      name: name.trim(),
      groupName: groupName.trim(),
      placeholders: names,
    });
    setIssues(parsed.error?.issues ?? []);
    if (!parsed.success || !(await keepName(parsed.data.name))) return;
    create({
      name: parsed.data.groupName,
      placeholders: parsed.data.placeholders ?? [],
    });
  };

  // Someone who lost their invite link joins from here, so this is their name step too
  const joinWithCode = async () => {
    const parsed = userNameSchema.safeParse(name.trim());
    setIssues(
      parsed.error?.issues.map((issue) => ({ ...issue, path: ["name"] })) ?? [],
    );
    if (parsed.success && (await keepName(parsed.data))) openJoin();
  };

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
