import {
  ChowChow,
  Module,
  ChowChowInternals,
  BaseContext,
  ChowChowState
} from '../ChowChow'
import supertest from 'supertest'

class MockChowChow extends ChowChow {
  startSpy = jest.fn()
  stopSpy = jest.fn()

  protected startServer(port: number): Promise<void> {
    this.startSpy(port)
    return Promise.resolve()
  }

  protected stopServer(): Promise<void> {
    this.stopSpy()
    return Promise.resolve()
  }
}

class FakeModule implements Module {
  app!: ChowChow

  checkEnvironment() {}
  setupModule() {}
  clearModule() {}
  extendExpress() {}
  extendEndpointContext() {
    return {}
  }
}

type CtxModuleCtx = { name: string }
class CtxModule extends FakeModule {
  extendEndpointContext(): CtxModuleCtx {
    return { name: 'geoff' }
  }
}

class BadEnvModule extends FakeModule {
  checkEnvironment() {
    throw new Error('Bad Env')
  }
}

const makeRouteModule = (spy: any) =>
  class RouteModule extends FakeModule {
    setupModule() {
      this.app.applyRoutes(spy)
    }
  }

class SpyModule extends FakeModule {
  setupSpy = jest.fn()
  clearSpy = jest.fn()
  expressSpy = jest.fn()
  contextSpy = jest.fn()

  setupModule(...args: any[]) {
    this.setupSpy(...args)
  }
  clearModule(...args: any[]) {
    this.clearSpy(...args)
  }
  extendExpress(...args: any[]) {
    this.expressSpy(...args)
  }
  extendEndpointContext(...args: any[]) {
    this.contextSpy(...args)
    return {}
  }
}

describe('ChowChow', () => {
  let chow!: MockChowChow & ChowChowInternals

  beforeEach(async () => {
    chow = new MockChowChow() as any
  })

  afterEach(async () => {
    await chow.stop()
  })

  describe('::create', () => {
    it('should create an instance', async () => {
      expect(ChowChow.create()).toBeDefined()
    })
  })

  describe('#use', () => {
    it('should register the module', async () => {
      chow.use(new FakeModule())
      expect(chow.modules).toHaveLength(1)
    })
    it('should put chowchow onto the module', async () => {
      let module = new FakeModule()
      chow.use(module)
      expect(module.app).toBe(chow)
    })
  })

  describe('#applyMiddleware', () => {})

  describe('#makeCtx', () => {
    it('should have the req, res and next', async () => {
      let req: any = {}
      let res: any = {}
      let next: any = () => {}
      let ctx = chow.makeCtx(req, res, next)
      expect(ctx.req).toBe(req)
      expect(ctx.res).toBe(res)
      expect(ctx.next).toBe(next)
    })
    it('should use modules to generate a context', async () => {
      chow.use(new CtxModule())
      let ctx = chow.makeCtx({} as any, {} as any, () => {})
      expect(ctx.name).toBe('geoff')
    })
  })

  describe('#applyRoutes', () => {
    it('should store route generator', async () => {
      chow.applyRoutes(jest.fn())
      expect(chow.routesToApply).toHaveLength(1)
    })
    it('should not call the generator', async () => {
      let spy = jest.fn()
      chow.applyRoutes(spy)
      expect(spy.mock.calls).toHaveLength(0)
    })
    it('should throw an error if started', async () => {
      await chow.start()

      const applyingRoutes = () => chow.applyRoutes(() => {})
      expect(applyingRoutes).toThrow()
    })
  })

  describe('#applyErrorHandler', () => {
    it('should store the generator', async () => {
      chow.applyErrorHandler(jest.fn())
      expect(chow.errorHandlers).toHaveLength(1)
    })
    it('should not call the generator', async () => {
      let spy = jest.fn()
      chow.applyErrorHandler(spy)
      expect(spy.mock.calls).toHaveLength(0)
    })
  })

  describe('#start', () => {
    let spy: SpyModule
    beforeEach(async () => {
      spy = new SpyModule()
      chow.use(spy)
    })

    it('should start express', async () => {
      await chow.start()
      expect(chow.startSpy.mock.calls).toHaveLength(1)
    })
    it('should fail for bad environments', async () => {
      chow.use(new BadEnvModule())
      const startingUp = chow.start({ logErrors: false })
      await expect(startingUp).rejects.toThrow()
    })
    it('should call #setupModule on modules', async () => {
      await chow.start()
      expect(spy.setupSpy.mock.calls).toHaveLength(1)
    })
    it('should call #extendExpress on modules', async () => {
      await chow.start()
      expect(spy.expressSpy.mock.calls).toHaveLength(1)
    })
    it('should apply routes to express', async () => {
      let route = jest.fn(({ res }: BaseContext) => res.send('hey'))

      chow.applyRoutes((app, r) => {
        app.get('/', r(route))
      })
      await chow.start()

      let agent = supertest(chow.expressApp)
      let res: supertest.Response = await agent.get('/')

      expect(res.status).toBe(200)
      expect(route.mock.calls).toHaveLength(1)
    })
    it('should register error handlers', async () => {
      let route = jest.fn(() => {
        throw new Error('Something went wrong')
      })

      let errorHandler = jest.fn((err, ctx: BaseContext) => ctx.res.send())
      chow.applyErrorHandler(errorHandler)

      chow.applyRoutes((app, r) => {
        app.get('/', r(route))
      })

      chow.use(new CtxModule())

      await chow.start()

      let agent = supertest(chow.expressApp)
      await agent.get('/')

      expect(errorHandler.mock.calls).toHaveLength(1)
      expect(errorHandler.mock.calls[0][0]).toBeInstanceOf(Error)
      expect(errorHandler.mock.calls[0][1].name).toBe('geoff')
    })
    it('should update the state', async () => {
      await chow.start()
      expect(chow.state).toBe(ChowChowState.running)
    })
    it('should apply module routes first', async () => {
      const calls = new Array<string>()
      const spyA = jest.fn(() => calls.push('A'))
      const spyB = jest.fn(() => calls.push('B'))

      const RouteModule = makeRouteModule(spyA)
      chow.applyRoutes(spyB)

      await chow.use(new RouteModule()).start()

      expect(calls).toEqual(['A', 'B'])
    })
    it('should add module routes after calling #extendExpress', async () => {
      const calls = new Array<string>()
      const spy = jest.fn(() => calls.push('B'))

      const RouteModule = class extends makeRouteModule(spy) {
        extendExpress() {
          calls.push('A')
        }
      }

      await chow.use(new RouteModule()).start()

      expect(calls).toEqual(['A', 'B'])
    })
  })

  describe('#stop', () => {
    let spyModule: SpyModule
    beforeEach(async () => {
      spyModule = new SpyModule()
      chow.use(spyModule)
      await chow.start()
    })
    it('should close express', async () => {
      await chow.stop()
      expect(chow.stopSpy.mock.calls).toHaveLength(1)
    })
    it('should call #clearModule on modules', async () => {
      await chow.stop()
      expect(spyModule.clearSpy.mock.calls).toHaveLength(1)
    })
    it('should update the state', async () => {
      await chow.stop()
      expect(chow.state).toBe(ChowChowState.stopped)
    })
    it('should reset the server', async () => {
      let before = [chow.httpServer, chow.expressApp]
      await chow.stop()
      let after = [chow.httpServer, chow.expressApp]

      expect(after[0]).not.toBe(before[0])
      expect(after[1]).not.toBe(before[1])
    })
  })
})
