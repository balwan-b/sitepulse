export type ArcjetConfig = {
  enabled: boolean;
  client: null;
};

export const getArcjetConfig = (): ArcjetConfig => {
  const key = process.env.ARCJET_KEY;

  if (!key) {
    return {
      enabled: false,
      client: null,
    };
  }

  // The base `arcjet` package expects an integration-provided client adapter.
  // Keep Arcjet disabled until we wire it into the Express request lifecycle.
  return {
    enabled: false,
    client: null,
  };
};
