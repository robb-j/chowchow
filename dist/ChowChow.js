"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const express_1 = __importDefault(require("express"));
class ChowChow {
    constructor() {
        this.modules = new Array();
        this.projDir = path_1.join(__dirname, '../');
        this.server = express_1.default();
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
        fn(this.server, route => async (req, res, next) => {
            try {
                await route(this.makeCtx(req, res, next));
            }
            catch (error) {
                next(error);
            }
        });
    }
    applyErrorHandler(fn) {
        this.server.use(((err, req, res, next) => {
            fn(err, this.makeCtx(req, res, next));
        }));
    }
    async start() {
        let errors = new Array();
        for (let module of this.modules) {
            try {
                module.checkEnvironment();
            }
            catch (error) {
                errors.push(module.constructor.name + ': ' + error.message);
            }
        }
        if (errors.length > 0) {
            errors.forEach(err => console.log(err));
            process.exit(1);
        }
        for (let module of this.modules) {
            module.setupModule();
        }
        await new Promise(resolve => this.server.listen(3000, resolve));
    }
}
exports.ChowChow = ChowChow;
//# sourceMappingURL=ChowChow.js.map