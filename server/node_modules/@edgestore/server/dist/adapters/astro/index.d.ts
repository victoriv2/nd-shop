import { type EdgeStoreRouter, type MaybePromise, type Provider } from '@edgestore/shared';
import type { APIContext } from 'astro';
import { type LogLevel } from '../../libs/logger';
import { type CookieConfig } from '../shared';
export type Config<TCtx> = {
    provider?: Provider;
    router: EdgeStoreRouter<TCtx>;
    logLevel?: LogLevel;
    cookieConfig?: CookieConfig;
} & (TCtx extends Record<string, never> ? object : {
    provider?: Provider;
    router: EdgeStoreRouter<TCtx>;
    createContext: (opts: APIContext) => MaybePromise<TCtx>;
    cookieConfig?: CookieConfig;
});
export declare function createEdgeStoreAstroHandler<TCtx>(config: Config<TCtx>): (context: APIContext) => Promise<Response>;
//# sourceMappingURL=index.d.ts.map