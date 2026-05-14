import type { GitActionResult } from "@git-viz/shared";
import { useActionsStore } from "../../state/actionsStore";

/**
 * Run an action call and surface its result through the toast store. Returns
 * the result so callers can branch on `ok` without rethrowing.
 */
export async function runAction(
  title: string,
  call: () => Promise<GitActionResult>
): Promise<GitActionResult> {
  let result: GitActionResult;
  try {
    result = await call();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result = {
      ok: false,
      stdout: "",
      stderr: message,
      exitCode: -1,
    };
  }
  useActionsStore.getState().pushToast(title, result);
  return result;
}
