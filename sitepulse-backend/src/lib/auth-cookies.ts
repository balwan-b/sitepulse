const hasCookieAttribute = (cookie: string, attribute: string) =>
  cookie.toLowerCase().includes(attribute.toLowerCase());

export const ensureAuthCookieFlags = (
  cookie: string,
  isProduction: boolean,
) => {
  let normalized = cookie;

  if (!hasCookieAttribute(normalized, "HttpOnly")) {
    normalized += "; HttpOnly";
  }

  if (isProduction) {
    if (!hasCookieAttribute(normalized, "Secure")) {
      normalized += "; Secure";
    }

    if (!hasCookieAttribute(normalized, "SameSite")) {
      normalized += "; SameSite=None";
    }
  }

  return normalized;
};
