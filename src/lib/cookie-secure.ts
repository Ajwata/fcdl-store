export function shouldUseSecureCookies(request?: Request): boolean {
  const override = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (override === "true") return true;
  if (override === "false") return false;

  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const proto = request?.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return proto === "https";
}
