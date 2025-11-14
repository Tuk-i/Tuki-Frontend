export type EnvRecord = Record<string, string | undefined>

const envSource = ((import.meta as unknown as { env?: EnvRecord }).env) ?? {}

export const readEnv = (key: string): string | undefined => envSource[key]

export const readEnvOr = (key: string, defaultValue: string): string => readEnv(key) ?? defaultValue

export const requireEnv = (key: string): string => {
  const value = readEnv(key)
  if (value === undefined || value === null || value === "") {
    throw new Error(`Environment variable "${key}" is not defined`)
  }
  return value
}
