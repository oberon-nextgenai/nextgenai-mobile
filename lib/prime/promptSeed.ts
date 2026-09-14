/**
 * Whether a deep-linked `prompt` param should be written into the Prime
 * composer.
 *
 * The rule, in this exact order:
 * 1. No prompt, or the same prompt that already seeded → never seed. A sent
 *    or already-applied prompt must not re-appear.
 * 2. A NEW prompt seeds only when the composer is empty or still holds the
 *    previous seed untouched — it never clobbers text the user typed.
 */
export function shouldSeedPrompt(
  prompt: string | undefined,
  previousSeed: string | null,
  currentInput: string,
): boolean {
  if (!prompt || prompt === previousSeed) return false;
  return currentInput.trim() === '' || currentInput === previousSeed;
}
