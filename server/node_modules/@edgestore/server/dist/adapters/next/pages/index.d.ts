import { type EdgeStoreRouter, type MaybePromise, type Provider } from '@edgestore/shared';
import { type NextApiRequest, type NextApiResponse } from 'next/types';
import { type LogLevel } from '../../../libs/logger';
import { type CookieConfig } from '../../shared';
export type CreateContextOptions = {
    req: NextApiRequest;
    res: NextApiResponse;
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
export declare function createEdgeStoreNextHandler<TCtx>(config: Config<TCtx>): (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
//# sourceMappingURL=index.d.ts.map