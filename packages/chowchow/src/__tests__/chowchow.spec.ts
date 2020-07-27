import request = require('supertest')
import { Chow } from '../chowchow'
import { HttpResponse } from '../http'

interface TestEnv {
  NAME: string
  NUM_CARROTS: string
}

type Context = {
  greet(name: string): string
}

const testEnv = {
  NAME: 'Geoff Testington',
  NUM_CARROTS: '42',
}

let chow: Chow<TestEnv, Context>

beforeEach(async () => {
  chow = new Chow<TestEnv, Context>(testEnv, (ctx) => ({
    greet: jest.fn((name) => `Hello ${name}`),
  }))
})

describe('Chow', () => {
  describe('#baseContext', () => {
    it('should have the env ', () => {
      const ctx = chow.baseContext()

      expect(ctx.env).toEqual(testEnv)
    })
    it('should have an emit method', () => {
      const ctx = chow.baseContext()

      const spy = jest.fn()
      chow.emit = spy

      ctx.emit('test-event', { name: 'Geoff' })

      expect(spy).toBeCalledWith('test-event', { name: 'Geoff' })
    })
  })

  describe('#makeContext', () => {
    it('should combine a baseContext with ctxFactory', async () => {
      const ctx = await chow.makeContext()

      expect(ctx).toEqual({
        env: testEnv,
        emit: expect.any(Function),
        greet: expect.any(Function),
      })
    })
  })

  describe('#event', () => {
    it('should register an event handler', async () => {
      const spy = jest.fn()

      chow.event('test-event', (ctx) => spy(ctx))

      chow.emit('test-event', {})

      await new Promise((resolve) => process.nextTick(resolve))

      expect(spy).toBeCalled()
    })
  })

  describe('#emit', () => {
    it('should emit an event for any listeners', async () => {
      const spy = jest.fn()
      const payload = {
        name: 'geoff',
        age: 42,
      }

      chow.event('test-event', (ctx) => spy(ctx))

      chow.emit('test-event', payload)

      await new Promise((resolve) => process.nextTick(resolve))

      expect(spy).toBeCalledWith(
        expect.objectContaining({
          event: {
            type: 'test-event',
            payload,
          },
        })
      )
    })
  })

  describe('#route', () => {
    it('should register a route', async () => {
      chow.route('get', '/test', (ctx) => ({
        message: 'Hello, world',
      }))

      const res = await request(chow.app).get('/test')

      expect(res.status).toEqual(200)
      expect(res.body).toEqual({ message: 'Hello, world' })
    })

    it('should process HttpResponse', async () => {
      chow.route(
        'get',
        '/test',
        (ctx) => new HttpResponse(419, { age: 42 }, { 'some-header': 'true' })
      )

      const res = await request(chow.app).get('/test')

      expect(res.status).toEqual(419)
      expect(res.body).toEqual({ age: 42 })
      expect(res.header['some-header']).toEqual('true')
    })

    it('should catch errors', async () => {
      const handler = chow.catchRouteError
      chow.catchRouteError = jest.fn(handler)

      const error = new Error('Test error')

      chow.route('get', '/test', (ctx) => {
        throw error
      })

      await request(chow.app).get('/test')

      expect(chow.catchRouteError).toBeCalledWith(
        error,
        expect.anything(),
        expect.anything()
      )
    })
  })

  describe('#middleware', () => {
    it('should call the middleware with the express app', () => {
      const spy = jest.fn()

      chow.middleware(spy)

      expect(spy).toBeCalledWith(chow.app)
    })
  })

  describe('#apply', () => {
    it('should call the chowers with itself', () => {
      let spy = jest.fn()

      chow.apply(spy)

      expect(spy).toBeCalledWith(chow)
    })
  })

  describe('#something', () => {
    // ...
  })
})
