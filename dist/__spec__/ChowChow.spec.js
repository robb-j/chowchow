"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ChowChow_1 = require("../ChowChow");
const supertest_1 = __importDefault(require("supertest"));
class FakeModule {
    checkEnvironment() { }
    setupModule() { }
    clearModule() { }
    extendExpress() { }
    extendEndpointContext() {
        return {};
    }
}
class CtxModule extends FakeModule {
    extendEndpointContext() {
        return { name: 'geoff' };
    }
}
class MockChowChow extends ChowChow_1.ChowChow {
    constructor() {
        super(...arguments);
        this.startSpy = jest.fn();
        this.stopSpy = jest.fn();
    }
    startServer(port) {
        this.startSpy(port);
        return Promise.resolve();
    }
    stopServer() {
        this.stopSpy();
        return Promise.resolve();
    }
}
class BadEnvModule extends FakeModule {
    checkEnvironment() {
        throw new Error('Bad Env');
    }
}
const makeRouteModule = (spy) => class RouteModule extends FakeModule {
    setupModule() {
        this.app.applyRoutes(spy);
    }
};
class SpyModule extends FakeModule {
    constructor() {
        super(...arguments);
        this.setupSpy = jest.fn();
        this.clearSpy = jest.fn();
        this.expressSpy = jest.fn();
        this.contextSpy = jest.fn();
    }
    setupModule(...args) {
        this.setupSpy(...args);
    }
    clearModule(...args) {
        this.clearSpy(...args);
    }
    extendExpress(...args) {
        this.expressSpy(...args);
    }
    extendEndpointContext(...args) {
        this.contextSpy(...args);
        return {};
    }
}
describe('ChowChow', () => {
    let chow;
    beforeEach(() => {
        chow = new MockChowChow();
    });
    afterEach(async () => {
        await chow.stop();
    });
    describe('::create', () => {
        it('should create an instance', () => {
            expect(ChowChow_1.ChowChow.create()).toBeDefined();
        });
    });
    describe('#use', () => {
        it('should register the module', () => {
            chow.use(new FakeModule());
            expect(chow.modules).toHaveLength(1);
        });
        it('should put chowchow onto the module', () => {
            let module = new FakeModule();
            chow.use(module);
            expect(module.app).toBe(chow);
        });
    });
    describe('#has', () => {
        it('should return true when a module is registered', () => {
            chow.use(new FakeModule());
            expect(chow.has(FakeModule)).toBeTruthy();
        });
    });
    describe('#getModule', () => {
        it('should return the module', () => {
            let fakeModule = new FakeModule();
            chow.use(fakeModule);
            let result = chow.getModule(FakeModule);
            expect(result).toEqual(fakeModule);
        });
    });
    describe('#applyMiddleware', () => {
        it('should call the handler with the express app', () => {
            let spy = jest.fn();
            chow.applyMiddleware(spy);
            expect(spy).toBeCalledWith(chow.expressApp);
        });
    });
    describe('#makeCtx', () => {
        it('should have the req, res and next', () => {
            let req = {};
            let res = {};
            let next = () => { };
            let ctx = chow.makeCtx(req, res, next);
            expect(ctx.req).toBe(req);
            expect(ctx.res).toBe(res);
            expect(ctx.next).toBe(next);
        });
        it('should use modules to generate a context', () => {
            chow.use(new CtxModule());
            let ctx = chow.makeCtx({}, {}, () => { });
            expect(ctx.name).toBe('geoff');
        });
    });
    describe('#applyRoutes', () => {
        it('should store route generator', () => {
            chow.applyRoutes(jest.fn());
            expect(chow.routesToApply).toHaveLength(1);
        });
        it('should not call the generator', () => {
            let spy = jest.fn();
            chow.applyRoutes(spy);
            expect(spy.mock.calls).toHaveLength(0);
        });
        it('should throw an error if started', async () => {
            await chow.start();
            const applyingRoutes = () => chow.applyRoutes(() => { });
            expect(applyingRoutes).toThrow();
        });
    });
    describe('#applyErrorHandler', () => {
        it('should store the generator', () => {
            chow.applyErrorHandler(jest.fn());
            expect(chow.errorHandlers).toHaveLength(1);
        });
        it('should not call the generator', () => {
            let spy = jest.fn();
            chow.applyErrorHandler(spy);
            expect(spy.mock.calls).toHaveLength(0);
        });
    });
    describe('#start', () => {
        let spy;
        beforeEach(() => {
            spy = new SpyModule();
            chow.use(spy);
        });
        it('should start express', async () => {
            await chow.start();
            expect(chow.startSpy).toBeCalled();
        });
        it('should fail for bad environments', async () => {
            chow.use(new BadEnvModule());
            const startingUp = chow.start({ logErrors: false });
            await expect(startingUp).rejects.toThrow();
        });
        it('should call #setupModule on modules', async () => {
            await chow.start();
            expect(spy.setupSpy).toBeCalled();
        });
        it('should call #extendExpress on modules', async () => {
            await chow.start();
            expect(spy.expressSpy).toBeCalled();
        });
        it('should apply routes to express', async () => {
            let route = jest.fn(({ res }) => {
                res.send('hey');
            });
            chow.applyRoutes((app, r) => {
                app.get('/', r(route));
            });
            await chow.start();
            let agent = supertest_1.default(chow.expressApp);
            let res = await agent.get('/');
            expect(res.status).toBe(200);
            expect(route).toBeCalled();
        });
        it('should register error handlers', async () => {
            let route = jest.fn(() => {
                throw new Error('Something went wrong');
            });
            let errorHandler = jest.fn((err, ctx) => {
                ctx.res.send();
            });
            chow.applyErrorHandler(errorHandler);
            chow.applyRoutes((app, r) => {
                app.get('/', r(route));
            });
            chow.use(new CtxModule());
            await chow.start();
            let agent = supertest_1.default(chow.expressApp);
            await agent.get('/');
            expect(errorHandler).toBeCalled();
            expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error);
            expect(errorHandler.mock.calls[0][1].name).toBe('geoff');
        });
        it('should update the state', async () => {
            await chow.start();
            expect(chow.state).toBe(ChowChow_1.ChowChowState.running);
        });
        it('should apply module routes first', async () => {
            const calls = new Array();
            const spyA = jest.fn(() => calls.push('A'));
            const spyB = jest.fn(() => calls.push('B'));
            const RouteModule = makeRouteModule(spyA);
            chow.applyRoutes(spyB);
            await chow.use(new RouteModule()).start();
            expect(calls).toEqual(['A', 'B']);
        });
        it('should add module routes after calling #extendExpress', async () => {
            const calls = new Array();
            const spy = jest.fn(() => calls.push('B'));
            const RouteModule = class extends makeRouteModule(spy) {
                extendExpress() {
                    calls.push('A');
                }
            };
            await chow.use(new RouteModule()).start();
            expect(calls).toEqual(['A', 'B']);
        });
    });
    describe('#stop', () => {
        let spyModule;
        beforeEach(async () => {
            spyModule = new SpyModule();
            chow.use(spyModule);
            await chow.start();
        });
        it('should close express', async () => {
            await chow.stop();
            expect(chow.stopSpy).toBeCalled();
        });
        it('should call #clearModule on modules', async () => {
            await chow.stop();
            expect(spyModule.clearSpy).toBeCalled();
        });
        it('should wait for module#clearModule to resolve', async () => {
            let awaited = false;
            spyModule.clearModule = jest.fn(async () => {
                await new Promise(resolve => process.nextTick(resolve));
                awaited = true;
            });
            await chow.stop();
            expect(awaited).toBe(true);
        });
        it('should update the state', async () => {
            await chow.stop();
            expect(chow.state).toBe(ChowChow_1.ChowChowState.stopped);
        });
        it('should reset the server', async () => {
            let before = [chow.httpServer, chow.expressApp];
            await chow.stop();
            let after = [chow.httpServer, chow.expressApp];
            expect(after[0]).not.toBe(before[0]);
            expect(after[1]).not.toBe(before[1]);
        });
    });
});
//# sourceMappingURL=ChowChow.spec.js.map