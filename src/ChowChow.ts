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

export class ChowChow {
  modules = new Array<Module>()
  private server = express()
  private routesToApply = new Array<RouterFn<any>>()
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
    this.server.use(((err, req, res, next) => {
      fn(err, this.makeCtx(req, res, next))
    }) as ExpressHandler)
  }

  async start() {
    let errors = new Array<string>()
    for (let module of this.modules) {
      try {
        module.checkEnvironment()
      } catch (error) {
        errors.push(module.constructor.name + ': ' + error.message)
      }
    }
    
    if (errors.length > 0) {
      errors.forEach(err => console.log(err))
      process.exit(1)
    }
    
    console.log('Setting up modules')
    for (let module of this.modules) {
      module.setupModule()
    }
    
    console.log('Extending express')
    for (let module of this.modules) {
      module.extendExpress(this.server)
    }
    
    console.log('Adding routes')
    for (let fn of this.routesToApply) {
      fn(this.server, route => async (req, res, next) => {
        try {
          await route(this.makeCtx(req, res, next))
        } catch (error) {
          next(error)
        }
      })
    }

    await new Promise(resolve => this.server.listen(3000, resolve))
    this.state = ChowChowState.running
  }
}
