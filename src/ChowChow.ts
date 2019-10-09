import stoppable from 'stoppable'
import { createServer } from 'http'

import express, {
  Application,
  Request,
  Response,
  NextFunction,
  RequestHandler
} from 'express'

export enum ChowChowState {
  stopped = 'stopped',
  setup = 'setup',
  running = 'running'
}

export type BaseContext = {
  req: Request
  res: Response
  next: NextFunction
}

/** A chowchow module, used to add functionality for your routes */
export interface Module {
  app: ChowChow
  checkEnvironment(): void
  setupModule(): void | Promise<void>
  clearModule(): void | Promise<void>
  extendExpress(expressApp: Application): void
  extendEndpointContext(ctx: BaseContext): { [idx: string]: any }
}

export type ExpressFn = (app: Application) => void

/** An express error handler, useful for improving code readability */
export type ExpressHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => void

/** A chowchow route */
export type ChowChowRoute<T> = (ctx: BaseContext & T) => Promise<void> | void

/** A chowchow error handler (it has the chowchow context) */
export type ErrorHandler<T> = (
  error: any,
  ctx: BaseContext & T
) => Promise<void> | void

/** A function to convert chowchow routes to express routes for you */
export type RouterFn<T> = (
  app: Application,
  r: (route: ChowChowRoute<T>) => RequestHandler
) => void

const nameOf = (o: object) => o.constructor.name

/** An interface to expose ChowChow internals for testing purposes */
export interface ChowChowInternals {
  state: ChowChowState
  modules: Array<Module>
  httpServer: stoppable.StoppableServer
  expressApp: express.Express
  routesToApply: Array<RouterFn<any>>
  errorHandlers: Array<ErrorHandler<any>>
}

interface Constructor<T> {
  new (...args: any[]): T
}

/** The chowchow app, where everything chowchow starts */
export class ChowChow<T extends BaseContext = BaseContext> {
  protected state = ChowChowState.stopped
  protected modules = new Array<Module>()
  protected expressApp = express()
  protected httpServer = stoppable(createServer(this.expressApp))
  protected routesToApply = new Array<RouterFn<any>>()
  protected errorHandlers = new Array<ErrorHandler<any>>()

  /** A static function to create a chow, useful for chaining. */
  static create<T extends BaseContext>(): ChowChow<T> {
    return new ChowChow<T>()
  }

  /** Add a module to chowchow, call order is important.
    Modules callbacks are called in chronological order on setup
    and reverse chronological order in teardown. */
  use(module: Module): ChowChow<T> {
    module.app = this
    this.modules.push(module)
    return this
  }

  /** Whether a module is registered */
  has(ModuleType: Function): boolean {
    return this.modules.some(m => m instanceof ModuleType)
  }

  /** Get a registered module */
  getModule<T extends Module>(ModuleType: Constructor<T>): T | undefined {
    return this.modules.find(m => m instanceof ModuleType) as any
  }

  /** Apply middleware to the internal express app. */
  applyMiddleware(fn: ExpressFn) {
    fn(this.expressApp)
  }

  /** Generate a chowchow context based on the current modules. */
  makeCtx(req: Request, res: Response, next: NextFunction): any {
    let ctx: any = { req, res, next }
    for (let module of this.modules) {
      Object.assign(ctx, module.extendEndpointContext(ctx))
    }
    return ctx
  }

  /**
    Register chowchow routes with a generator,
    the generator isn't called until #start is called.
    It will throw if chowchow is already started.
  */
  applyRoutes(fn: RouterFn<T>) {
    switch (this.state) {
      case ChowChowState.running:
        throw new Error('Cannot add routes once running')

      default:
        this.routesToApply.push(fn)
    }
  }

  /** 
    Register chowchow error handlers with a generator,
    the generator isn't called until #start is called.
    It will throw if chowchow is already started.
  */
  applyErrorHandler(fn: ErrorHandler<T>) {
    if (this.state === ChowChowState.running) {
      throw new Error('Cannot add error handlers once running')
    }
    this.errorHandlers.push(fn)
  }

  /**
    Start up chowchow, calling module callbacks, applying routes
    and error handlers then starting the express server.
    It will throw an error if any module's fail #checkEnvironment.
  */
  async start({ verbose = false, port = 3000, logErrors = true } = {}) {
    const logIfVerbose = verbose ? console.log : () => {}

    this.state = ChowChowState.setup

    //
    // Check each module's environment, catching errors (for now)
    //
    logIfVerbose('Checking environment')
    let invalidEnvironment = false
    for (let module of this.modules) {
      try {
        module.checkEnvironment()
        logIfVerbose(' ✓ ' + nameOf(module))
      } catch (error) {
        if (logErrors) {
          console.log(' ✕ ' + nameOf(module) + ': ' + error.message)
        }
        invalidEnvironment = true
      }
    }

    //
    // Fail if any module's environment was invalid
    //
    if (invalidEnvironment) throw new Error('Invalid environment')

    //
    // Remember what routes have been registered upto this point
    //
    const existingRoutes = this.routesToApply
    this.routesToApply = []

    //
    // Setup each module
    //
    logIfVerbose('Setting up modules')

    for (let module of this.modules) {
      await module.setupModule()
      logIfVerbose(' ✓ ' + nameOf(module))
    }

    //
    // Let each module extend express
    //
    logIfVerbose('Extending express')
    for (let module of this.modules) {
      module.extendExpress(this.expressApp)
      logIfVerbose(' ✓ ' + nameOf(module))
    }

    //
    // Put routes registered in modules before those previously registered
    //
    this.routesToApply = this.routesToApply.concat(existingRoutes)

    //
    // Apply routes by calling their generator
    //
    logIfVerbose('Adding routes')
    for (let fn of this.routesToApply) {
      this.registerRoute(fn)
    }
    this.routesToApply = []

    //
    // Create an express error handler which uses the registered handlers
    //
    logIfVerbose('Adding error handler')
    this.expressApp.use(((err, req, res, next) => {
      let ctx = this.makeCtx(req, res, next)
      for (let handler of this.errorHandlers) handler(err, ctx)
    }) as ExpressHandler)

    //
    // Startup the http server
    //
    await this.startServer(port)
    this.state = ChowChowState.running
  }

  /** Stop chowchow, clearing modules, stopping the server and resetting it. */
  async stop() {
    if (this.state !== ChowChowState.running) return

    // Clear each module in reverse order
    for (let module of this.modules.reverse()) {
      await module.clearModule()
    }

    // Stop the http server
    await this.stopServer()
    this.state = ChowChowState.stopped

    // Reset the app & server to avoid strange configuration
    this.expressApp = express()
    this.httpServer = stoppable(createServer(this.expressApp))
  }

  /** Register a route with express by calling its generator */
  protected registerRoute(fn: RouterFn<T>) {
    fn(this.expressApp, route => async (req, res, next) => {
      try {
        await route(this.makeCtx(req, res, next))
      } catch (error) {
        next(error)
      }
    })
  }

  /** Internal method to start the express server (overriden in tests) */
  protected startServer(port: number): Promise<void> {
    return new Promise(resolve => this.httpServer.listen(port, resolve))
  }

  /** Internal method to stop the express server (overriden in tests) */
  protected stopServer(): Promise<void> {
    return new Promise((resolve, reject) =>
      this.httpServer.stop(err => (err ? reject(err) : resolve()))
    )
  }
}
