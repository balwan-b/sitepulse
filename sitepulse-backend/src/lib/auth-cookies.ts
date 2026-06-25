const hasCookieAttribute = (cookie: string, attribute: string) =>
  cookie.toLowerCase().includes(attribute.toLowerCase());

const replaceCookieAttribute = (
  cookie: string,
  attributePattern: RegExp,
  replacement: string,
) => cookie.replace(attributePattern, replacement);

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

    if (hasCookieAttribute(normalized, "SameSite")) {
      normalized = replaceCookieAttribute(
        normalized,
        /;\s*SameSite=[^;]+/i,
        "; SameSite=None",
      );
    } else {
      normalized += "; SameSite=None";
    }
  }

  return normalized;
};
