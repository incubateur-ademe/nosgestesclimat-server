// Auto-generated with "generateEnvDeclaration" script
/* eslint-disable */
declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Dist: `development`
     * {@link [Local Env Dist](.env.development)}
     */
    NODE_ENV?: string
    /**
     * Dist: `your_secret`
     * {@link [Local Env Dist](.env.development)}
     */
    JWT_SECRET?: string
    /**
     * Dist: `3001`
     * {@link [Local Env Dist](.env.development)}
     */
    PORT?: string
    /**
     * Dist: `mongodb://your_mongo_url`
     * {@link [Local Env Dist](.env.development)}
     */
    MONGO_URL?: string
    /**
     * Dist: `your_brevo_api_key`
     * {@link [Local Env Dist](.env.development)}
     */
    BREVO_API_KEY?: string
  }
}
declare type ProcessEnvCustomKeys =
  | 'NODE_ENV'
  | 'JWT_SECRET'
  | 'PORT'
  | 'MONGO_URL'
  | 'BREVO_API_KEY'

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never

type LastOf<T> =
  UnionToIntersection<T extends any ? () => T : never> extends () => infer R
    ? R
    : never

type Push<T extends any[], V> = [...T, V]

type TuplifyUnion<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false,
> = true extends N ? [] : Push<TuplifyUnion<Exclude<T, L>>, L>
