/**
 * This file is an exploration of how to efficiently unit test chowchow resources
 */

import { match } from 'path-to-regexp'

import {
  Chowish,
  EnvKeys,
  ChowMethod,
  ChowRequest,
  RouteHandler,
  BaseContext,
} from '@robb_j/chowchow'

/** An internal type for storing routes so thet can be called programatically */
interface DebugRoute<R extends RouteHandler<any>> {
  method: ChowMethod
  path: string
  handler: R
  match: ReturnType<typeof match>
}

export interface MockChowish<E extends EnvKeys, C extends BaseContext<E>>
  extends Chowish<E, C> {
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
function fakeRouter(
  chow: Chowish<any, any>,
  routes: DebugRoute<RouteHandler<any>>[]
) {
  return async (
    method: ChowMethod,
    path: string,
    { headers = {}, query = {}, body = '' } = {}
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

    return route.handler({ ...ctx, emit: chow.emit, request })
  }
}

export async function mockchow<
  T extends object,
  E extends EnvKeys,
  C extends BaseContext<E>
>(chowFactory: () => Chowish<E, C>, extras: T): Promise<MockChowish<E, C> & T> {
  const chow = chowFactory()
  const routes: DebugRoute<RouteHandler<any>>[] = []

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
  const emit = jest.fn((eventName: string, payload: any) => {
    return chow.emit(eventName, payload)
  })

  //
  // Override registering a route so it can be inserted
  // and internaly store routes for calling directly (see #http)
  //
  const route = jest.fn((method, path, handler) => {
    chow.route(method, path, handler)
    routes.push({
      match: match(path, { decode: decodeURIComponent }),
      method,
      path,
      handler,
    })
  })

  //
  // Wrap other methods too so they can be tested
  //
  const middleware = jest.fn((h) => chow.middleware(h))
  const apply = jest.fn((...args) => chow.apply(...args))
  const makeContext = jest.fn(() => chow.makeContext())

  //
  // Return our testable chow instance,
  // with user-defined extras on there too
  //
  return {
    env: chow.env,
    http,
    waitForEvents,
    emit,
    event,
    route,
    middleware,
    apply,
    makeContext,
    ...extras,
  }
}
