import { type EdgeStoreRouter, type MaybePromise, type Provider } from '@edgestore/shared';
import { type NextRequest } from 'next/server';
import { type LogLevel } from '../../../libs/logger';
import { type CookieConfig } from '../../shared';
export type CreateContextOptions = {
    req: NextRequest;
};
export type Config<TCtx> = {
    provider?: Provider;
    router: EdgeStoreRouter<TCtx>;
    logLevel?: LogLevel;
    cookieConfig?: CookieConfig;
} & (TCtx extends Record<string, never> ? object : {
    provider?: Provider;
    router: EdgeStoreRouter<TCtx>;
    createContext: (opts: CreateContextOptions) => MaybePromise<TCtx>;
    cookieConfig?: CookieConfig;
});
export declare function createEdgeStoreNextHandler<TCtx>(config: Config<TCtx>): (req: NextRequest) => Promise<Response>;
//# sourceMappingURL=index.d.ts.map