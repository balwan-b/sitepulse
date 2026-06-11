export const VALIDATION_CONTRACT_VERSION = "2026-06-08";

export const TEXT_PATTERNS = {
  identifier: /^[A-Za-z0-9:_-]+$/,
  personName: /^[A-Za-z\s.'-]+$/,
  descriptiveText: /^[A-Za-z0-9\s\-(),/&.%:;#]+$/,
  uppercaseCode: /^[A-Z0-9-]+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

export const FIELD_LIMITS = {
  identifier: { min: 3, max: 128 },
  name: { min: 2, max: 80 },
  code: { min: 2, max: 32 },
  email: { min: 5, max: 160 },
  description: { min: 2, max: 500 },
  notes: { min: 2, max: 1000 },
  password: { min: 8, max: 128 },
} as const;
