import { describe, expect, it } from "vitest";
import { matchLocale } from "./config";
import { makeTranslator } from "./translate";

describe("makeTranslator", () => {
  const t = makeTranslator({
    nav: { feed: "Feed" },
    greeting: "Hi {name}, you have {count} messages",
    list: ["first", "second"],
  });

  it("resolves nested keys", () => {
    expect(t("nav.feed")).toBe("Feed");
  });

  it("returns the key when missing", () => {
    expect(t("nav.missing")).toBe("nav.missing");
    expect(t("totally.unknown")).toBe("totally.unknown");
  });

  it("fills placeholders", () => {
    expect(t("greeting", { name: "Ann", count: 3 })).toBe(
      "Hi Ann, you have 3 messages",
    );
  });

  it("indexes into arrays by numeric key", () => {
    expect(t("list.0")).toBe("first");
    expect(t("list.1")).toBe("second");
  });
});

describe("matchLocale", () => {
  it("picks the first supported base tag", () => {
    expect(matchLocale("zh-CN,zh;q=0.9,en;q=0.8")).toBe("zh");
    expect(matchLocale("en-US,en;q=0.9")).toBe("en");
    expect(matchLocale("fr-FR,fr;q=0.9,en;q=0.5")).toBe("en");
  });

  it("defaults to en for missing or unknown", () => {
    expect(matchLocale(null)).toBe("en");
    expect(matchLocale("de,ja")).toBe("en");
  });
});
