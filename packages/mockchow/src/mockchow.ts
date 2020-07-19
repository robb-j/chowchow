/**
 * This file is an exploration of how to efficiently unit test chowchow resources
 */

import { match } from 'path-to-regexp'

import {
  Chowish,
  ChowMethod,
  ChowRequest,
  RouteHandler,
  BaseContext,
} from '@robb_j/chowchow'

/** An internal type for storing routes so thet can be called programatically */
export interface DebugRoute<C> {
  method: ChowMethod
  path: string
  handler: RouteHandler<C>
  match: ReturnType<typeof match>
}

export interface MockChowish {
  /**
   * Simulate a http request to a route with url params, headers queries & bodies
   */
  http(
    method: ChowMethod,
    path: string,
    request?: Partial<ChowRequest>
  ): Promise<any>

  /**
   * A utility to wait for events to be triggered (waits for process.nextTick)
   */
  waitForEvents(): Promise<any>
}

//
// Generates a function for programatically calling routes from tests
// - Uses the same internal package as express for evaluation paths & params
// - Throws errors directly if they aren't found
// - Injects the 'emit' (bit of a hack) so you can assert it was called
//   - the issue is the emit.bind() in chow wraps the jest.fn
//
export function fakeRouter<E, C extends BaseContext<E>>(
  chow: Chowish<E, C>,
  routes: DebugRoute<C>[]
) {
  return async (
    method: ChowMethod,
    path: string,
    { headers = {}, query = {}, body = '' as any } = {}
  ) => {
    const route = routes.find((r) => r.method === method && r.match(path))

    //
    // Fail the test if the route doesn't exist
    // but offer help by showing available routes
    //
    if (!route) {
      console.log(
        'Known routes: \n',
        routes.map((r) => r.method + ':' + r.path).join('\n ')
      )
      throw new Error('Not found: ' + method + ':' + path)
    }

    const { params } = route.match(path)! as any

    const request: ChowRequest = { headers, query, params, body }
    const ctx = await chow.makeContext()

    return route.handler({ ...ctx, request })
  }
}

export function makeDebugRoute<C>(
  method: ChowMethod,
  path: string,
  handler: RouteHandler<C>
): DebugRoute<C> {
  return {
    method: method,
    path: path,
    handler: handler,
    match: match(path, { decode: decodeURIComponent }),
  }
}

/**
 * Creates an object that implements Chowish but for testing
 */
export function mockchow<T extends object, E, C extends BaseContext<E>>(
  chow: Chowish<E, C>,
  extras: T
): MockChowish & Chowish<E, C> & T {
  const routes: DebugRoute<C>[] = []

  //
  // Create a fake router to test endpoints
  //
  const http = fakeRouter(chow, routes)

  //
  // A method to wait for events to propegate
  //
  const waitForEvents = () => {
    return new Promise((resolve) => process.nextTick(resolve))
  }

  //
  // Override registering an event so it can be tested
  //
  const event = jest.fn((eventName, handler: any) => {
    return chow.event(eventName, handler)
  })

  //
  // Override emitting an event so it can be tested
  //
  const originalEmit = chow.emit.bind(chow)
  const emit = jest.fn((eventName: string, payload: any) => {
    return originalEmit(eventName, payload)
  })

  //
  // Override registering a route so it can be inserted
  // and internaly store routes for calling directly (see #http)
  //
  const route = jest.fn((method, path, handler) => {
    chow.route(method, path, handler)
    routes.push(makeDebugRoute(method, path, handler))
  })

  //
  // Wrap other methods too so they can be tested
  //
  const middleware = jest.fn((h) => chow.middleware(h))
  const apply = jest.fn((...args) => chow.apply(...args))
  const makeContext = jest.fn(() => chow.makeContext())

  //
  // Override emit on chow
  //
  chow.emit = emit

  //
  // Return our testable chow instance,
  // with user-defined extras on there too
  //
  return {
    env: chow.env,
    ...extras,
    http,
    waitForEvents,
    emit,
    event,
    route,
    middleware,
    apply,
    makeContext,
  }
}
