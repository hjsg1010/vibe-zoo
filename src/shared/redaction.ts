import { AppError } from "./errors.js";
export const sensitiveName =
  /(pass(word|wd)?|secret|token|cookie|authorization|api[-_ ]?key|access[-_ ]?keys?|private[-_ ]?key|credential|session|csrf|otp|credit.?card)/i;
const sensitiveValue =
  /(Bearer\s+\S+|AWS4-HMAC|AKIA[0-9A-Z]{16}|-----BEGIN .*PRIVATE KEY|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.)/i;
export function assertSafeData(value: unknown): void {
  const walk = (v: unknown): void => {
    if (typeof v === "string" && (sensitiveValue.test(v) || v.length > 20000))
      throw new AppError("invalid_input");
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
    } else if (v && typeof v === "object")
      for (const [k, x] of Object.entries(v)) {
        if (sensitiveName.test(k)) throw new AppError("invalid_input");
        walk(x);
      }
  };
  walk(value);
}
export function cleanText(value: string, max = 300): string {
  return value
    .replace(/https?:\/\/[^\s<>"']+/g, "[주소]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[이메일]")
    .replace(/(?:Bearer\s+\S+|eyJ[\w.-]+)/g, "[제외]")
    .slice(0, max);
}
