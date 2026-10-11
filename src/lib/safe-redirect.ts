/**
 * Only same-site paths are allowed as post-sign-in destinations, so a crafted
 * `?callbackUrl=` can't bounce the owner to another site. Pure, so it's unit-tested.
 */
export function safeCallbackPath(value: unknown, fallback = "/my-work"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  // "//host" and "/\host" are protocol-relative URLs to another site.
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
