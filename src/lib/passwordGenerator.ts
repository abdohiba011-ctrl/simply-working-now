/**
 * Cryptographically random password generator for agency signup.
 * Guarantees at least one char from each class: upper, lower, digit, symbol.
 */
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I, O
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // no l, o
const DIGIT = "23456789"; // no 0, 1
const SYMBOL = "!@#$%^&*-_=+";

function pick(set: string, rand: Uint32Array, idx: number): string {
  return set[rand[idx] % set.length];
}

export function generateStrongPassword(length = 16): string {
  const len = Math.max(12, length);
  const rand = new Uint32Array(len);
  crypto.getRandomValues(rand);

  const all = UPPER + LOWER + DIGIT + SYMBOL;
  const chars: string[] = [
    pick(UPPER, rand, 0),
    pick(LOWER, rand, 1),
    pick(DIGIT, rand, 2),
    pick(SYMBOL, rand, 3),
  ];
  for (let i = chars.length; i < len; i++) {
    chars.push(all[rand[i] % all.length]);
  }
  // Fisher-Yates shuffle with fresh randomness
  const shuffleRand = new Uint32Array(len);
  crypto.getRandomValues(shuffleRand);
  for (let i = len - 1; i > 0; i--) {
    const j = shuffleRand[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
