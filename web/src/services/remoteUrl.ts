export type RemoteHost = "github" | "gitlab" | "bitbucket" | "unknown";

export interface ParsedRemote {
  host: RemoteHost;
  hostname: string;
  owner: string;
  repo: string;
  baseUrl: string;
}

const HOST_BY_DOMAIN: Record<string, RemoteHost> = {
  "github.com": "github",
  "gitlab.com": "gitlab",
  "bitbucket.org": "bitbucket",
};

function trimGitSuffix(s: string): string {
  return s.endsWith(".git") ? s.slice(0, -4) : s;
}

export function parseRemoteUrl(remoteUrl: string): ParsedRemote | null {
  if (!remoteUrl) return null;
  const url = remoteUrl.trim();

  // ssh form: git@host:owner/repo.git
  const sshMatch = url.match(/^[^@\s]+@([^:]+):(.+)$/);
  if (sshMatch) {
    const hostname = sshMatch[1];
    const path = trimGitSuffix(sshMatch[2].replace(/^\/+/, ""));
    return makeParsed(hostname, path);
  }

  // ssh:// or git:// or https:// or http://
  try {
    const u = new URL(url);
    const hostname = u.hostname;
    const path = trimGitSuffix(u.pathname.replace(/^\/+/, ""));
    return makeParsed(hostname, path);
  } catch {
    return null;
  }
}

function makeParsed(hostname: string, path: string): ParsedRemote | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const host = HOST_BY_DOMAIN[hostname] ?? inferHostFromName(hostname);
  const owner = parts[0];
  const repo = parts.slice(1).join("/");
  return {
    host,
    hostname,
    owner,
    repo,
    baseUrl: `https://${hostname}`,
  };
}

function inferHostFromName(hostname: string): RemoteHost {
  if (hostname.includes("github")) return "github";
  if (hostname.includes("gitlab")) return "gitlab";
  if (hostname.includes("bitbucket")) return "bitbucket";
  return "unknown";
}

export function inferCommitUrl(remoteUrl: string, hash: string): string | null {
  const parsed = parseRemoteUrl(remoteUrl);
  if (!parsed) return null;
  return commitUrlFor(parsed, hash);
}

export function commitUrlFor(parsed: ParsedRemote, hash: string): string {
  const { baseUrl, owner, repo, host } = parsed;
  switch (host) {
    case "github":
      return `${baseUrl}/${owner}/${repo}/commit/${hash}`;
    case "gitlab":
      return `${baseUrl}/${owner}/${repo}/-/commit/${hash}`;
    case "bitbucket":
      return `${baseUrl}/${owner}/${repo}/commits/${hash}`;
    default:
      // Best-effort: github-style path; many self-hosted services use it.
      return `${baseUrl}/${owner}/${repo}/commit/${hash}`;
  }
}

export function hostLabel(host: RemoteHost): string {
  switch (host) {
    case "github":
      return "GitHub";
    case "gitlab":
      return "GitLab";
    case "bitbucket":
      return "Bitbucket";
    default:
      return "Remote";
  }
}
