import { validateEnv } from 'valid-env'

export type EnvKeys = string

// export interface EnvContext<E extends EnvKeys = string> {
//   env: Record<E, string>
// }

/**
 * A utility to make an environment that conforms to a generic set of keys
 * -> uses https://github.com/robb-j/valid-env/
 */
export function makeEnv<E extends EnvKeys>(keys: E[]): Record<EnvKeys, string> {
  validateEnv(keys)

  const obj: any = {}
  for (const key of keys) obj[key] = process.env[key]
  return obj
}
