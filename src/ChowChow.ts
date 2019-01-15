import express, { Application, Request, Response, NextFunction, RequestHandler } from 'express'

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
    fn(this.server, route => async (req, res, next) => {
      try {
        await route(this.makeCtx(req, res, next))
      } catch (error) {
        next(error)
      }
    })
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
    for (let module of this.modules) {
      module.setupModule()
    }
    
    for (let module of this.modules) {
      module.extendExpress(this.server)
    }

    await new Promise(resolve => this.server.listen(3000, resolve))
  }
}
