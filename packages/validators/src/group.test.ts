import { describe, expect, it } from "vitest";

import { splitFlatmateNames } from "./group";

describe("splitFlatmateNames", () => {
  it.each(["Lena, Tim", "Lena und Tim", "lena and Tim", "Lena & Tim, lena"])(
    "reads %j as two flatmates",
    (raw) => {
      expect(splitFlatmateNames(raw).map((name) => name.toLowerCase())).toEqual(
        ["lena", "tim"],
      );
    },
  );

  it("keeps a name that only contains the word", () => {
    expect(splitFlatmateNames("Gundula")).toEqual(["Gundula"]);
  });
});
