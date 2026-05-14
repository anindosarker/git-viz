import { describe, expect, test } from "vitest";
import { hasAnyFilter, isHashLike, parseSearch, toCommitFilter } from "../searchQuery";

describe("parseSearch", () => {
  test("empty input -> empty parsed", () => {
    const r = parseSearch("");
    expect(r.query).toBe("");
    expect(r.paths).toEqual([]);
    expect(r.refs).toEqual([]);
    expect(r.author).toBeUndefined();
    expect(hasAnyFilter(r)).toBe(false);
  });

  test("free text only", () => {
    const r = parseSearch("fix the bug");
    expect(r.query).toBe("fix the bug");
    expect(r.author).toBeUndefined();
    expect(hasAnyFilter(r)).toBe(true);
  });

  test("author qualifier", () => {
    const r = parseSearch("author:anindo");
    expect(r.author).toBe("anindo");
    expect(r.query).toBe("");
  });

  test("mixed qualifiers + free text", () => {
    const r = parseSearch("fix author:anindo path:backend/ since:2024-01-01");
    expect(r.query).toBe("fix");
    expect(r.author).toBe("anindo");
    expect(r.paths).toEqual(["backend/"]);
    expect(r.since).toBe("2024-01-01");
  });

  test("multiple paths and refs", () => {
    const r = parseSearch("path:a/ path:b/ ref:main ref:dev");
    expect(r.paths).toEqual(["a/", "b/"]);
    expect(r.refs).toEqual(["main", "dev"]);
  });

  test("quoted values preserve spaces", () => {
    const r = parseSearch('author:"Anindo Sarker" foo bar');
    expect(r.author).toBe("Anindo Sarker");
    expect(r.query).toBe("foo bar");
  });

  test("hash qualifier", () => {
    const r = parseSearch("hash:1c25a3f");
    expect(r.hash).toBe("1c25a3f");
  });

  test("unknown qualifier treated as free text", () => {
    const r = parseSearch("foo:bar");
    expect(r.query).toBe("foo:bar");
  });

  test("until and since", () => {
    const r = parseSearch("until:2025-01-01 since:2024-01-01");
    expect(r.since).toBe("2024-01-01");
    expect(r.until).toBe("2025-01-01");
  });

  test("toCommitFilter strips empty fields", () => {
    const f = toCommitFilter(parseSearch("fix author:anindo"), false);
    expect(f).toEqual({ query: "fix", author: "anindo" });
  });

  test("toCommitFilter passes regex flag", () => {
    const f = toCommitFilter(parseSearch("foo"), true);
    expect(f.query).toBe("foo");
    expect(f.queryRegex).toBe(true);
  });

  test("trailing/leading whitespace", () => {
    const r = parseSearch("   author:foo   bar  ");
    expect(r.author).toBe("foo");
    expect(r.query).toBe("bar");
  });
});

describe("isHashLike", () => {
  test("7-char hex matches", () => {
    expect(isHashLike("1c25a3f")).toBe(true);
  });
  test("40-char hex matches", () => {
    expect(isHashLike("1c25a3f".padEnd(40, "a"))).toBe(true);
  });
  test("too short fails", () => {
    expect(isHashLike("1c25a3")).toBe(false);
  });
  test("non-hex fails", () => {
    expect(isHashLike("zzzzzzz")).toBe(false);
  });
});
