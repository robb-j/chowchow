"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
var ChowChowState;
(function (ChowChowState) {
    ChowChowState["stopped"] = "stopped";
    ChowChowState["running"] = "running";
})(ChowChowState = exports.ChowChowState || (exports.ChowChowState = {}));
const nameOf = (o) => o.constructor.name;
class ChowChow {
    constructor() {
        this.modules = new Array();
        this.server = express_1.default();
        this.routesToApply = new Array();
        this.errorHandlers = new Array();
        this.state = ChowChowState.stopped;
    }
    static create() {
        return new ChowChow();
    }
    use(module) {
        module.app = this;
        this.modules.push(module);
        return this;
    }
    applyMiddleware(fn) {
        fn(this.server);
    }
    makeCtx(req, res, next) {
        let ctx = { req, res, next };
        for (let module of this.modules) {
            Object.assign(ctx, module.extendEndpointContext(ctx));
        }
        return ctx;
    }
    applyRoutes(fn) {
        if (this.state === ChowChowState.running) {
            throw new Error('Cannot add routes once running');
        }
        this.routesToApply.push(fn);
    }
    applyErrorHandler(fn) {
        if (this.state === ChowChowState.running) {
            throw new Error('Cannot add error handlers once running');
        }
        this.errorHandlers.push(fn);
    }
    async start({ verbose = false, port = 3000 }) {
        const logIfVerbose = verbose ? console.log : () => { };
        logIfVerbose('Checking environment');
        let errors = new Array();
        for (let module of this.modules) {
            try {
                module.checkEnvironment();
                logIfVerbose(' ✓ ' + nameOf(module));
            }
            catch (error) {
                errors.push(' 𐄂 ' + nameOf(module) + ': ' + error.message);
            }
        }
        if (errors.length > 0) {
            errors.forEach(err => console.log(err));
            process.exit(1);
        }
        logIfVerbose('Setting up modules');
        for (let module of this.modules) {
            await module.setupModule();
            logIfVerbose(' ✓ ' + nameOf(module));
        }
        logIfVerbose('Extending express');
        for (let module of this.modules) {
            module.extendExpress(this.server);
            logIfVerbose(' ✓ ' + nameOf(module));
        }
        logIfVerbose('Adding routes');
        for (let fn of this.routesToApply) {
            fn(this.server, route => async (req, res, next) => {
                try {
                    await route(this.makeCtx(req, res, next));
                }
                catch (error) {
                    next(error);
                }
            });
        }
        this.routesToApply = [];
        logIfVerbose('Adding error handler');
        this.server.use(((err, req, res, next) => {
            let ctx = this.makeCtx(req, res, next);
            for (let handler of this.errorHandlers)
                handler(err, ctx);
        }));
        await new Promise(resolve => this.server.listen(port, resolve));
        this.state = ChowChowState.running;
    }
}
exports.ChowChow = ChowChow;
//# sourceMappingURL=ChowChow.js.map