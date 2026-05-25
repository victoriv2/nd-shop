import { type EdgeStoreRouter, type MaybePromise, type Provider } from '@edgestore/shared';
import { type Request, type Response } from 'express';
import { type LogLevel } from '../../libs/logger';
import { type CookieConfig } from '../shared';
export type CreateContextOptions = {
    req: Request;
    res: Response;
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
export declare function createEdgeStoreExpressHandler<TCtx>(config: Config<TCtx>): (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=index.d.ts.map