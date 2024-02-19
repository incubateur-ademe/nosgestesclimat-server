export const sleep = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));

type DefaultEnsureEnvVar = <T extends primitive | primitive[]>(
  envVar: string | undefined,
  transformerOrDefaultValue?: T | ((envVar: string) => T),
  defaultValue?: T,
) => T | string;

type EnsureEnvVar = {
  (envVar: string | undefined): asserts envVar is string;
  <T>(envVar: string | undefined, defaultValue: T): T;
  <T>(envVar: string | undefined, transformer: (envVar: string) => T): T;
  <T>(envVar: string | undefined, transformer: (envVar: string) => T, defaultValue: T): T;
};
type primitive = boolean | number | string;

const ensureEnvVar_: DefaultEnsureEnvVar = (envVar, transformerOrDefaultValue, defaultValue) => {
  const defaultValueToTest = typeof transformerOrDefaultValue !== "function" ? transformerOrDefaultValue : defaultValue;
  if (typeof envVar === "undefined" && typeof defaultValueToTest === "undefined") {
    throw new Error(`Some env var are not found.`, { cause: { envVar, transformerOrDefaultValue, defaultValue } });
  }

  if (typeof envVar === "undefined" && typeof defaultValue !== "undefined") return defaultValue;

  if (typeof transformerOrDefaultValue === "function") {
    return transformerOrDefaultValue(envVar!) ?? envVar ?? defaultValue;
  }

  return envVar ?? transformerOrDefaultValue!;
};
// TODO use "satisfies"
export const ensureEnvVar = ensureEnvVar_ as EnsureEnvVar;
