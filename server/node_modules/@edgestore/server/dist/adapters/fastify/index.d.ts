import { type EdgeStoreRouter, type MaybePromise, type Provider } from '@edgestore/shared';
import { type FastifyReply, type FastifyRequest } from 'fastify';
import { type LogLevel } from '../../libs/logger';
import { type CookieConfig } from '../shared';
export type CreateContextOptions = {
    req: FastifyRequest;
    reply: FastifyReply;
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
export declare function createEdgeStoreFastifyHandler<TCtx>(config: Config<TCtx>): (req: FastifyRequest, reply: FastifyReply) => Promise<never>;
//# sourceMappingURL=index.d.ts.map