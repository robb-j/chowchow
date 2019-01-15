import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express'

export enum ChowChowState {
  stopped = 'stopped',
  running = 'running'
}

export type BaseContext = {
  req: Request
  res: Response
  next: NextFunction
}

export interface Module {
  app: ChowChow
  checkEnvironment(): void
  setupModule(): void
  clearModule(): void
  extendExpress(server: Application): void
  extendEndpointContext(ctx: BaseContext): { [idx: string]: any }
}

export type ExpressFn = (app: Application) => void

export type ExpressHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => void

export type ChowChowRoute<T> = (ctx: BaseContext & T) => Promise<void> | void

export type ErrorHandler<T> = (
  error: any,
  ctx: BaseContext & T
) => Promise<void> | void

export type RouterFn<T> = (
  app: Application,
  r: (route: ChowChowRoute<T>) => RequestHandler
) => void

const nameOf = (o: object) => o.constructor.name

export class ChowChow {
  modules = new Array<Module>()
  private server = express()
  private routesToApply = new Array<RouterFn<any>>()
  private handlersToApply = new Array<ErrorHandler<any>>()
  private state = ChowChowState.stopped
  
  static create() { return new ChowChow() }

  use(module: Module): ChowChow {
    module.app = this
    this.modules.push(module)
    return this
  }

  applyMiddleware(fn: ExpressFn) {
    fn(this.server)
  }

  makeCtx(req: Request, res: Response, next: NextFunction): any {
    let ctx: any = { req, res, next }
    for (let module of this.modules) {
      Object.assign(ctx, module.extendEndpointContext(ctx))
    }
    return ctx
  }

  applyRoutes<T>(fn: RouterFn<T>) {
    if (this.state === ChowChowState.running) {
      throw new Error('Cannot add routes once running')
    }
    this.routesToApply.push(fn)
  }

  applyErrorHandler<T>(fn: ErrorHandler<T>) {
    if (this.state === ChowChowState.running) {
      throw new Error('Cannot add error handlers once running')
    }
    this.handlersToApply.push(fn)
  }

  async start({ verbose = false }) {
    const logIfVerbose = verbose ? console.log : () => {}
    
    logIfVerbose('Checking environment')
    let errors = new Array<string>()
    for (let module of this.modules) {
      try {
        module.checkEnvironment()
        logIfVerbose(' ✓ ' + nameOf(module))
      } catch (error) {
        errors.push(' ⨉ ' + nameOf(module) + ': ' + error.message)
      }
    }
    
    if (errors.length > 0) {
      errors.forEach(err => console.log(err))
      process.exit(1)
    }
    
    logIfVerbose('Setting up modules')
    for (let module of this.modules) {
      module.setupModule()
      logIfVerbose(' ✓ ' + nameOf(module))
    }
    
    logIfVerbose('Extending express')
    for (let module of this.modules) {
      module.extendExpress(this.server)
      logIfVerbose(' ✓ ' + nameOf(module))
    }
    
    logIfVerbose('Adding routes')
    for (let fn of this.routesToApply) {
      fn(this.server, route => async (req, res, next) => {
        try {
          await route(this.makeCtx(req, res, next))
        } catch (error) {
          next(error)
        }
      })
    }
    this.routesToApply = []
    
    console.log('Adding handlers')
    for (let fn of this.handlersToApply) {
      this.server.use(((err, req, res, next) => {
        fn(err, this.makeCtx(req, res, next))
      }) as ExpressHandler)
    }
    this.handlersToApply = []

    await new Promise(resolve => this.server.listen(3000, resolve))
    this.state = ChowChowState.running
  }
}
