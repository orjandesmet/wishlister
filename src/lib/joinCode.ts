/**
 * The invite code in what someone typed or pasted: either the bare code or the
 * whole invite link (".../join/<code>"). Null when there's no code in it.
 */
export function parseJoinCode(input: string): string | null {
  const text = input.trim();
  const fromLink = /\/join\/([^/?#\s]+)/.exec(text);
  const code = fromLink ? fromLink[1] : text;
  return /^[a-z0-9]+$/i.test(code) ? code.toLowerCase() : null;
}
