import { IncomingHttpHeaders, Server, OutgoingHttpHeaders } from 'http'
import { Application, Request } from 'express'

export type ChowMethod = 'get' | 'post' | 'delete' | 'patch'

export interface ChowRequest {
  params: Record<string, string | undefined>
  headers: IncomingHttpHeaders
  query: Record<string, string | undefined>
  body: string | any | Buffer
}

export interface RouteHandler<C> {
  (ctx: C & { request: ChowRequest }): any | Promise<any>
}

export interface MiddlewareHandler {
  (app: Application): void
}

/**
 * A wrapped http response, so you can set a status and/or headers
 */
export class HttpResponse {
  constructor(
    public status: number,
    public body: object | string | Buffer,
    public headers: OutgoingHttpHeaders = {}
  ) {}
}

/**
 * A reusable http json message e.g. for returning errors
 */
export class HttpMessage extends HttpResponse {
  constructor(status: number, message: string) {
    super(status, { message })
  }
}

/**
 * A http response to redirect somewhere
 */
export class HttpRedirect extends HttpResponse {
  constructor(public location: string, permenant = false) {
    super(permenant ? 301 : 302, '', { location })
  }
}

/** Create a ChowRequest from a express.Request */
export function createRequest(request: Request): ChowRequest {
  return {
    params: { ...request.params } as any,
    headers: { ...request.headers },
    query: { ...request.query } as any,
    body: request.body,
  }
}
