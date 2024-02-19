// Auto-generated with "generateEnvDeclaration" script
/* eslint-disable */
declare namespace NodeJS {
    interface ProcessEnv {
        /**
         * Dist: `development`  
         * {@link [Local Env Dist](.env.development)}
         */
        NODE_ENV?: string;
        /**
         * Dist: `your_secret`  
         * {@link [Local Env Dist](.env.development)}
         */
        JWT_SECRET?: string;
        /**
         * Dist: `3001`  
         * {@link [Local Env Dist](.env.development)}
         */
        PORT?: string;
        /**
         * Dist: `mongodb://your_mongo_url`  
         * {@link [Local Env Dist](.env.development)}
         */
        MONGO_URL?: string;
        /**
         * Dist: `your_brevo_api_key`  
         * {@link [Local Env Dist](.env.development)}
         */
        BREVO_API_KEY?: string;
        /**
         * Dist: `your_matomo_url`  
         * {@link [Local Env Dist](.env.development)}
         */
        MATOMO_URL?: string;
        /**
         * Dist: `your_matomo_token`  
         * {@link [Local Env Dist](.env.development)}
         */
        MATOMO_TOKEN?: string;
    }
}
declare type ProcessEnvCustomKeys = 
    | 'NODE_ENV'
    | 'JWT_SECRET'
    | 'PORT'
    | 'MONGO_URL'
    | 'BREVO_API_KEY'
    | 'MATOMO_URL'
    | 'MATOMO_TOKEN';