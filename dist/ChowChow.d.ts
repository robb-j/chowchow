import { Application, Request, Response, NextFunction, RequestHandler } from 'express';
export declare type BaseContext = {
    req: Request;
    res: Response;
    next: NextFunction;
};
export interface Module {
    app: ChowChow;
    checkEnvironment(): void;
    setupModule(): void;
    clearModule(): void;
    extendExpress(server: Application): void;
    extendEndpointContext(ctx: BaseContext): {
        [idx: string]: any;
    };
}
export declare type ExpressFn = (app: Application) => void;
export declare type ExpressHandler = (error: any, req: Request, res: Response, next: NextFunction) => void;
export declare type ChowChowRoute<T> = (ctx: BaseContext & T) => Promise<void> | void;
export declare type ErrorHandler<T> = (error: any, ctx: BaseContext & T) => Promise<void> | void;
export declare type RouterFn<T> = (app: Application, r: (route: ChowChowRoute<T>) => RequestHandler) => void;
export declare class ChowChow {
    modules: Module[];
    projDir: string;
    private server;
    use(module: Module): ChowChow;
    applyMiddleware(fn: ExpressFn): void;
    makeCtx(req: Request, res: Response, next: NextFunction): any;
    applyRoutes<T>(fn: RouterFn<T>): void;
    applyErrorHandler<T>(fn: ErrorHandler<T>): void;
    start(): Promise<void>;
}
