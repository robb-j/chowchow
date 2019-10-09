import stoppable from 'stoppable';
import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express';
export declare enum ChowChowState {
    stopped = "stopped",
    setup = "setup",
    running = "running"
}
export declare type BaseContext = {
    req: Request;
    res: Response;
    next: NextFunction;
};
/** A chowchow module, used to add functionality for your routes */
export interface Module {
    app: ChowChow;
    checkEnvironment(): void;
    setupModule(): void | Promise<void>;
    clearModule(): void | Promise<void>;
    extendExpress(expressApp: Application): void;
    extendEndpointContext(ctx: BaseContext): {
        [idx: string]: any;
    };
}
export declare type ExpressFn = (app: Application) => void;
/** An express error handler, useful for improving code readability */
export declare type ExpressHandler = (error: any, req: Request, res: Response, next: NextFunction) => void;
/** A chowchow route */
export declare type ChowChowRoute<T> = (ctx: BaseContext & T) => Promise<void> | void;
/** A chowchow error handler (it has the chowchow context) */
export declare type ErrorHandler<T> = (error: any, ctx: BaseContext & T) => Promise<void> | void;
/** A function to convert chowchow routes to express routes for you */
export declare type RouterFn<T> = (app: Application, r: (route: ChowChowRoute<T>) => RequestHandler) => void;
/** An interface to expose ChowChow internals for testing purposes */
export interface ChowChowInternals {
    state: ChowChowState;
    modules: Array<Module>;
    httpServer: stoppable.StoppableServer;
    expressApp: express.Express;
    routesToApply: Array<RouterFn<any>>;
    errorHandlers: Array<ErrorHandler<any>>;
}
interface Constructor<T> {
    new (...args: any[]): T;
}
/** The chowchow app, where everything chowchow starts */
export declare class ChowChow<T extends BaseContext = BaseContext> {
    protected state: ChowChowState;
    protected modules: Module[];
    protected expressApp: import("express-serve-static-core").Express;
    protected httpServer: stoppable.StoppableServer;
    protected routesToApply: RouterFn<any>[];
    protected errorHandlers: ErrorHandler<any>[];
    /** A static function to create a chow, useful for chaining. */
    static create<T extends BaseContext>(): ChowChow<T>;
    /** Add a module to chowchow, call order is important.
      Modules callbacks are called in chronological order on setup
      and reverse chronological order in teardown. */
    use(module: Module): ChowChow<T>;
    /** Whether a module is registered */
    has(ModuleType: Function): boolean;
    /** Get a registered module */
    getModule<T extends Module>(ModuleType: Constructor<T>): T | undefined;
    /** Apply middleware to the internal express app. */
    applyMiddleware(fn: ExpressFn): void;
    /** Generate a chowchow context based on the current modules. */
    makeCtx(req: Request, res: Response, next: NextFunction): any;
    /**
      Register chowchow routes with a generator,
      the generator isn't called until #start is called.
      It will throw if chowchow is already started.
    */
    applyRoutes(fn: RouterFn<T>): void;
    /**
      Register chowchow error handlers with a generator,
      the generator isn't called until #start is called.
      It will throw if chowchow is already started.
    */
    applyErrorHandler(fn: ErrorHandler<T>): void;
    /**
      Start up chowchow, calling module callbacks, applying routes
      and error handlers then starting the express server.
      It will throw an error if any module's fail #checkEnvironment.
    */
    start({ verbose, port, logErrors }?: {
        verbose?: boolean | undefined;
        port?: number | undefined;
        logErrors?: boolean | undefined;
    }): Promise<void>;
    /** Stop chowchow, clearing modules, stopping the server and resetting it. */
    stop(): Promise<void>;
    /** Register a route with express by calling its generator */
    protected registerRoute(fn: RouterFn<T>): void;
    /** Internal method to start the express server (overriden in tests) */
    protected startServer(port: number): Promise<void>;
    /** Internal method to stop the express server (overriden in tests) */
    protected stopServer(): Promise<void>;
}
export {};
