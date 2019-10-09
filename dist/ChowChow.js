"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stoppable_1 = __importDefault(require("stoppable"));
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
var ChowChowState;
(function (ChowChowState) {
    ChowChowState["stopped"] = "stopped";
    ChowChowState["setup"] = "setup";
    ChowChowState["running"] = "running";
})(ChowChowState = exports.ChowChowState || (exports.ChowChowState = {}));
const nameOf = (o) => o.constructor.name;
/** The chowchow app, where everything chowchow starts */
class ChowChow {
    constructor() {
        this.state = ChowChowState.stopped;
        this.modules = new Array();
        this.expressApp = express_1.default();
        this.httpServer = stoppable_1.default(http_1.createServer(this.expressApp));
        this.routesToApply = new Array();
        this.errorHandlers = new Array();
    }
    /** A static function to create a chow, useful for chaining. */
    static create() {
        return new ChowChow();
    }
    /** Add a module to chowchow, call order is important.
      Modules callbacks are called in chronological order on setup
      and reverse chronological order in teardown. */
    use(module) {
        module.app = this;
        this.modules.push(module);
        return this;
    }
    /** Whether a module is registered */
    has(ModuleType) {
        return this.modules.some(m => m instanceof ModuleType);
    }
    /** Get a registered module */
    getModule(ModuleType) {
        return this.modules.find(m => m instanceof ModuleType);
    }
    /** Apply middleware to the internal express app. */
    applyMiddleware(fn) {
        fn(this.expressApp);
    }
    /** Generate a chowchow context based on the current modules. */
    makeCtx(req, res, next) {
        let ctx = { req, res, next };
        for (let module of this.modules) {
            Object.assign(ctx, module.extendEndpointContext(ctx));
        }
        return ctx;
    }
    /**
      Register chowchow routes with a generator,
      the generator isn't called until #start is called.
      It will throw if chowchow is already started.
    */
    applyRoutes(fn) {
        switch (this.state) {
            case ChowChowState.running:
                throw new Error('Cannot add routes once running');
            default:
                this.routesToApply.push(fn);
        }
    }
    /**
      Register chowchow error handlers with a generator,
      the generator isn't called until #start is called.
      It will throw if chowchow is already started.
    */
    applyErrorHandler(fn) {
        if (this.state === ChowChowState.running) {
            throw new Error('Cannot add error handlers once running');
        }
        this.errorHandlers.push(fn);
    }
    /**
      Start up chowchow, calling module callbacks, applying routes
      and error handlers then starting the express server.
      It will throw an error if any module's fail #checkEnvironment.
    */
    async start({ verbose = false, port = 3000, logErrors = true } = {}) {
        const logIfVerbose = verbose ? console.log : () => { };
        this.state = ChowChowState.setup;
        //
        // Check each module's environment, catching errors (for now)
        //
        logIfVerbose('Checking environment');
        let invalidEnvironment = false;
        for (let module of this.modules) {
            try {
                module.checkEnvironment();
                logIfVerbose(' ✓ ' + nameOf(module));
            }
            catch (error) {
                if (logErrors) {
                    console.log(' ✕ ' + nameOf(module) + ': ' + error.message);
                }
                invalidEnvironment = true;
            }
        }
        //
        // Fail if any module's environment was invalid
        //
        if (invalidEnvironment)
            throw new Error('Invalid environment');
        //
        // Remember what routes have been registered upto this point
        //
        const existingRoutes = this.routesToApply;
        this.routesToApply = [];
        //
        // Setup each module
        //
        logIfVerbose('Setting up modules');
        for (let module of this.modules) {
            await module.setupModule();
            logIfVerbose(' ✓ ' + nameOf(module));
        }
        //
        // Let each module extend express
        //
        logIfVerbose('Extending express');
        for (let module of this.modules) {
            module.extendExpress(this.expressApp);
            logIfVerbose(' ✓ ' + nameOf(module));
        }
        //
        // Put routes registered in modules before those previously registered
        //
        this.routesToApply = this.routesToApply.concat(existingRoutes);
        //
        // Apply routes by calling their generator
        //
        logIfVerbose('Adding routes');
        for (let fn of this.routesToApply) {
            this.registerRoute(fn);
        }
        this.routesToApply = [];
        //
        // Create an express error handler which uses the registered handlers
        //
        logIfVerbose('Adding error handler');
        this.expressApp.use(((err, req, res, next) => {
            let ctx = this.makeCtx(req, res, next);
            for (let handler of this.errorHandlers)
                handler(err, ctx);
        }));
        //
        // Startup the http server
        //
        await this.startServer(port);
        this.state = ChowChowState.running;
    }
    /** Stop chowchow, clearing modules, stopping the server and resetting it. */
    async stop() {
        if (this.state !== ChowChowState.running)
            return;
        // Clear each module in reverse order
        for (let module of this.modules.reverse()) {
            await module.clearModule();
        }
        // Stop the http server
        await this.stopServer();
        this.state = ChowChowState.stopped;
        // Reset the app & server to avoid strange configuration
        this.expressApp = express_1.default();
        this.httpServer = stoppable_1.default(http_1.createServer(this.expressApp));
    }
    /** Register a route with express by calling its generator */
    registerRoute(fn) {
        fn(this.expressApp, route => async (req, res, next) => {
            try {
                await route(this.makeCtx(req, res, next));
            }
            catch (error) {
                next(error);
            }
        });
    }
    /** Internal method to start the express server (overriden in tests) */
    startServer(port) {
        return new Promise(resolve => this.httpServer.listen(port, resolve));
    }
    /** Internal method to stop the express server (overriden in tests) */
    stopServer() {
        return new Promise((resolve, reject) => this.httpServer.stop(err => (err ? reject(err) : resolve())));
    }
}
exports.ChowChow = ChowChow;
//# sourceMappingURL=ChowChow.js.map