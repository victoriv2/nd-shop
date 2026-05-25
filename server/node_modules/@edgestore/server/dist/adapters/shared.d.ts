import { type AnyBuilder, type EdgeStoreRouter, type Provider, type SharedDeleteFileRes, type SharedInitRes, type SharedRequestUploadPartsRes, type SharedRequestUploadRes } from '@edgestore/shared';
export type CookieOptions = {
    /**
     * Cookie path
     * @default "/"
     */
    path?: string;
    /**
     * Cookie max age in seconds
     * @default 2592000 (30 days)
     */
    maxAge?: number;
    /**
     * Cookie domain
     */
    domain?: string;
    /**
     * Cookie same site policy
     */
    sameSite?: 'strict' | 'lax' | 'none';
    /**
     * Cookie secure flag
     */
    secure?: boolean;
    /**
     * Cookie http only flag
     */
    httpOnly?: boolean;
};
export type CookieConfig = {
    /**
     * Context cookie configuration
     */
    ctx?: {
        /**
         * Name of the context cookie
         * @default "edgestore-ctx"
         */
        name?: string;
        /**
         * Cookie options for context cookie
         */
        options?: CookieOptions;
    };
    /**
     * Token cookie configuration
     */
    token?: {
        /**
         * Name of the token cookie
         * @default "edgestore-token"
         */
        name?: string;
        /**
         * Cookie options for token cookie
         */
        options?: CookieOptions;
    };
};
type ResolvedCookieConfig = {
    ctx: {
        name: string;
        options: CookieOptions;
    };
    token: {
        name: string;
        options: CookieOptions;
    };
};
/**
 * Merges the provided cookie configuration with default values
 */
export declare function getCookieConfig(cookieConfig?: CookieConfig): ResolvedCookieConfig;
export declare function init<TCtx>(params: {
    provider: Provider;
    router: EdgeStoreRouter<TCtx>;
    ctx: TCtx;
    cookieConfig?: CookieConfig;
}): Promise<SharedInitRes>;
export type RequestUploadBody = {
    bucketName: string;
    input: any;
    fileInfo: {
        size: number;
        type: string;
        extension: string;
        fileName?: string;
        replaceTargetUrl?: string;
        temporary: boolean;
    };
};
export declare function requestUpload<TCtx>(params: {
    provider: Provider;
    router: EdgeStoreRouter<TCtx>;
    ctxToken: string | undefined;
    body: RequestUploadBody;
}): Promise<SharedRequestUploadRes>;
export type RequestUploadPartsParams = {
    multipart: {
        uploadId: string;
        parts: number[];
    };
    path: string;
};
export declare function requestUploadParts<TCtx>(params: {
    provider: Provider;
    router: EdgeStoreRouter<TCtx>;
    ctxToken: string | undefined;
    body: RequestUploadPartsParams;
}): Promise<SharedRequestUploadPartsRes>;
export type CompleteMultipartUploadBody = {
    bucketName: string;
    uploadId: string;
    key: string;
    parts: {
        partNumber: number;
        eTag: string;
    }[];
};
export declare function completeMultipartUpload<TCtx>(params: {
    provider: Provider;
    router: EdgeStoreRouter<TCtx>;
    ctxToken: string | undefined;
    body: CompleteMultipartUploadBody;
}): Promise<import("@edgestore/shared").CompleteMultipartUploadRes>;
export type ConfirmUploadBody = {
    bucketName: string;
    url: string;
};
export declare function confirmUpload<TCtx>(params: {
    provider: Provider;
    router: EdgeStoreRouter<TCtx>;
    ctxToken: string | undefined;
    body: ConfirmUploadBody;
}): Promise<import("@edgestore/shared").ConfirmUploadRes>;
export type DeleteFileBody = {
    bucketName: string;
    url: string;
};
export declare function deleteFile<TCtx>(params: {
    provider: Provider;
    router: EdgeStoreRouter<TCtx>;
    ctxToken: string | undefined;
    body: DeleteFileBody;
}): Promise<SharedDeleteFileRes>;
export declare function buildPath(params: {
    fileInfo: RequestUploadBody['fileInfo'];
    bucket: AnyBuilder;
    pathAttrs: {
        ctx: any;
        input: any;
    };
}): {
    key: string;
    value: string;
}[];
export declare function parsePath(path: {
    key: string;
    value: string;
}[]): {
    parsedPath: Record<string, string>;
    pathOrder: string[];
};
export declare function getEnv(key: string): string | undefined;
export declare function isDev(): boolean;
export {};
//# sourceMappingURL=shared.d.ts.map