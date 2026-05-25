import { type EdgeStoreRouter, type MaybePromise, type Provider } from '@edgestore/shared';
import { type LogLevel } from '../../libs/logger';
import { type CookieConfig } from '../shared';
export type CreateContextOptions = {
    req: Request;
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
export declare function createEdgeStoreStartHandler<TCtx>(config: Config<TCtx>): ({ request }: {
    request: Request;
}) => Promise<Response>;
//# sourceMappingURL=index.d.ts.map