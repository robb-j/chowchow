import {
  ChowEventDef,
  EventHandler,
  EmitFunction,
  EventNotHandledError,
} from './events'
import { ChowMethod } from './http'
import {
  RouteHandler,
  MiddlewareHandler,
  createRequest,
  HttpResponse,
} from './http'
import { EventEmitter } from 'events'
import { createServer } from 'http'
import express = require('express')
import cors = require('cors')
import path = require('path')
import globby = require('globby')

export type StartOptions = Partial<{
  port: number
  outputUrl: boolean
  handle404s: boolean
}>

export type HelperOptions = Partial<{
  jsonBody: boolean
  urlEncodedBody: boolean
  corsHosts: string | string[]
  trustProxy: boolean
}>

// export type BaseContext<E extends EnvKeys> = EnvContext<E> & EmitContext
export interface BaseContext<E> {
  emit: EmitFunction
  env: E
}

type Ctx<C, E> = C & BaseContext<E>
type MaybePromise<T> = Promise<T> | T

export interface Chowish<E, C extends object> {
  env: E

  event<T extends ChowEventDef>(
    eventName: T['name'],
    handler: EventHandler<T['payload'], Ctx<C, E>>
  ): void
  emit<T extends ChowEventDef>(
    eventName: T['name'],
    payload: T['payload']
  ): void

  route(
    method: ChowMethod,
    path: string,
    handler: RouteHandler<Ctx<C, E>>
  ): void
  middleware(handler: MiddlewareHandler): void

  apply(...chowers: ((chow: this) => void)[]): void

  makeContext(): MaybePromise<Ctx<C, E>>
}

export class Chow<E, C extends object> implements Chowish<E, C> {
  eventEmitter = new EventEmitter()
  app = express()
  server = createServer(this.app)

  constructor(
    public env: E,
    public ctxFactory: (ctx: BaseContext<E>) => MaybePromise<C>
  ) {}

  baseContext(): BaseContext<E> {
    return {
      env: { ...this.env },
      emit: (eventName, payload) => this.emit(eventName, payload),
    }
  }

  async makeContext() {
    const base = this.baseContext()
    const rest = await this.ctxFactory(this.baseContext())
    return { ...base, ...rest }
  }

  // Chowish#event
  event<T extends ChowEventDef>(
    eventName: T['name'],
    handler: EventHandler<T['payload'], Ctx<C, E>>
  ) {
    this.eventEmitter.addListener(eventName, async (payload: any) => {
      try {
        const ctx = await this.makeContext()
        const event = { type: eventName, payload }

        await handler({ ...ctx, event })
      } catch (error) {
        this.catchEventError(error, eventName)
      }
    })
  }

  // Chowish#emit
  emit<T extends ChowEventDef>(eventName: T['name'], payload: T['payload']) {
    const handled = this.eventEmitter.emit(eventName, payload)
    if (!handled) {
      this.catchEventError(new EventNotHandledError(), eventName)
    }
  }

  // Chowish#route
  route(method: ChowMethod, path: string, handler: RouteHandler<Ctx<C, E>>) {
    this.app[method](path, async (req, res) => {
      try {
        const result = await handler({
          ...(await this.makeContext()),
          request: createRequest(req),
        })

        this.handleRouteResult(result, res)
      } catch (error) {
        this.catchRouteError(error, path, req, res)
      }
    })
  }

  // Chowish#middleware
  middleware(handler: MiddlewareHandler) {
    handler(this.app)
  }

  // Chowish#apply
  apply(...chowers: ((chow: this) => void)[]) {
    for (const chower of chowers) chower(this)
  }

  /** Experimental, could change at any time */
  async magicApply(base: string, pattern: string = 'routes/*.{ts,js}') {
    const fullPatern = path.join(base, pattern)
    const matches = await globby(fullPatern)
    const modules: Function[] = []

    for (const file of matches) {
      const chower = await import(file)

      const fn = chower.default ?? chower

      if (typeof fn !== 'function') {
        throw new Error(`magicApply found a non-function at "${file}"`)
      }
      fn(this)

      modules.push(fn)
    }

    return modules
  }

  addHelpers({
    trustProxy = false,
    jsonBody = false,
    urlEncodedBody = false,
    corsHosts = [],
  }: HelperOptions) {
    const { app } = this

    //
    // Parse json bodies
    // -> https://expressjs.com/en/api.html#express.json
    //
    if (jsonBody) {
      app.use(express.json())
    }

    //
    // Parse url encoded bodies
    // -> https://expressjs.com/en/api.html#express.urlencoded
    //
    if (urlEncodedBody) {
      app.use(express.urlencoded({ extended: true }))
    }

    //
    // Register cors hosts for web-based users
    // https://github.com/expressjs/cors#readme
    //
    if (corsHosts.length > 0) {
      app.use(cors({ origin: corsHosts }))
    }

    //
    // Trust connections when behind a reverse proxy
    // -> https://expressjs.com/en/guide/behind-proxies.html
    //
    if (trustProxy) {
      app.set('trust proxy', 1)
    }
  }

  //
  // start/stop
  //
  async start({
    port = 3000,
    handle404s = false,
    outputUrl = false,
  }: StartOptions = {}) {
    const { app } = this

    //
    // Add a fallback route which will return a http 404 error
    //
    if (handle404s) {
      app.get('*', (req, res) => {
        this.handleRouteResult(new HttpResponse(404, 'Not found'), res)
      })
    }

    //
    // Wait for the server to start
    // and store the http.Server instance so we can shut it down if needed
    //
    await new Promise((resolve) => this.server.listen(port, resolve))

    //
    // Output the url to stdout
    //
    if (outputUrl) {
      console.log('Listening on http://localhost:3000')
    }
  }

  /** Stop the server and ceist to accept new connections */
  stop() {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  //
  // Handling
  //

  /** A centralised place to catch errors that occur when handling events */
  catchEventError(error: Error, eventName: string) {
    console.error(`Error handling '${eventName}'`)
    console.error(error)
  }

  /** A centralised place to catch errors that occur when handling routes */
  catchRouteError(error: Error, path: string, req: express.Request, res: express.Response) {
    console.error(`Error handling route '${path}'`)
    console.error(error)
    res.status(400).send({ message: 'Something went wrong' })
  }

  /** Handle whatever a route returned */
  handleRouteResult(result: any, res: express.Response) {
    if (result instanceof HttpResponse) {
      res.status(result.status).set(result.headers).send(result.body)
    } else {
      res.send(result)
    }
  }
}
