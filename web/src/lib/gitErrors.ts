/**
 * Maps common git stderr patterns to actionable hint text. Used by the
 * action-result toast to give the user a recovery path beyond raw stderr.
 */

interface HintRule {
  pattern: RegExp;
  hint: string;
}

const HINT_RULES: HintRule[] = [
  {
    pattern: /Your local changes (to the following files )?would be overwritten/i,
    hint: "Stash or commit changes, then retry.",
  },
  {
    pattern: /non[-\s]fast[-\s]forward/i,
    hint: "Pull first, or use --force-with-lease.",
  },
  {
    pattern: /(merge conflict|CONFLICT \(content\)|fix conflicts)/i,
    hint: "Resolve conflicts in editor, then continue or abort.",
  },
  {
    pattern: /not a valid object name/i,
    hint: "Ref no longer exists. Refresh the view.",
  },
  {
    pattern: /pathspec '[^']+' did not match/i,
    hint: "The named ref or path was not found.",
  },
  {
    pattern: /(uncommitted changes|you have unstaged changes|cannot rebase: you have unstaged)/i,
    hint: "Commit or stash your changes before continuing.",
  },
  {
    pattern: /branch '[^']+' is not fully merged/i,
    hint: "Use force-delete if you really want to discard the commits.",
  },
  {
    pattern: /Updates were rejected/i,
    hint: "Fetch and rebase, or push with --force-with-lease.",
  },
  {
    pattern: /(detached HEAD|switched to a new branch)/i,
    hint: "You are in detached HEAD — create a branch to keep new commits.",
  },
  {
    pattern: /could not lock config file|index\.lock|fatal: Unable to create.+\.lock/i,
    hint: "Another git process is running. Wait for it to finish or remove the .lock file.",
  },
  {
    pattern: /Authentication failed|could not read Username/i,
    hint: "Check credentials or push via SSH.",
  },
];

export function gitErrorHint(stderr: string | undefined): string | undefined {
  if (!stderr) return undefined;
  for (const { pattern, hint } of HINT_RULES) {
    if (pattern.test(stderr)) return hint;
  }
  return undefined;
}
