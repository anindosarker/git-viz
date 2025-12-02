/**
 * A helper function that returns a unique alphanumeric string.
 *
 * @remarks This is used to generate a nonce (number used once) for the
 * Content Security Policy (CSP) of the webview.
 *
 * @returns A unique string
 */
export function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
