import { describe, expect, it } from "vitest";
import { commitUrlFor, inferCommitUrl, parseRemoteUrl } from "../services/remoteUrl";

describe("parseRemoteUrl", () => {
  it("parses github ssh", () => {
    const p = parseRemoteUrl("git@github.com:foo/bar.git");
    expect(p).toMatchObject({ host: "github", owner: "foo", repo: "bar" });
  });
  it("parses github https", () => {
    const p = parseRemoteUrl("https://github.com/foo/bar.git");
    expect(p).toMatchObject({ host: "github", owner: "foo", repo: "bar" });
  });
  it("parses gitlab nested", () => {
    const p = parseRemoteUrl("git@gitlab.com:group/sub/repo.git");
    expect(p).toMatchObject({ host: "gitlab", owner: "group", repo: "sub/repo" });
  });
  it("parses bitbucket", () => {
    const p = parseRemoteUrl("https://bitbucket.org/team/repo");
    expect(p).toMatchObject({ host: "bitbucket", owner: "team", repo: "repo" });
  });
  it("returns null for garbage", () => {
    expect(parseRemoteUrl("not a url")).toBeNull();
  });
});

describe("commit URL inference", () => {
  it("github", () => {
    expect(inferCommitUrl("git@github.com:foo/bar.git", "deadbeef")).toBe(
      "https://github.com/foo/bar/commit/deadbeef"
    );
  });
  it("gitlab", () => {
    expect(inferCommitUrl("https://gitlab.com/foo/bar.git", "abc")).toBe(
      "https://gitlab.com/foo/bar/-/commit/abc"
    );
  });
  it("bitbucket", () => {
    expect(inferCommitUrl("https://bitbucket.org/foo/bar", "abc")).toBe(
      "https://bitbucket.org/foo/bar/commits/abc"
    );
  });
  it("falls back to github-style for self-hosted gitea-like", () => {
    const p = parseRemoteUrl("https://git.example.com/foo/bar.git");
    expect(p?.host).toBe("unknown");
    expect(commitUrlFor(p!, "abc")).toBe("https://git.example.com/foo/bar/commit/abc");
  });
});
