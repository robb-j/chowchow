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

  describe('#addHelpers', () => {
    it('should enable json body parsing', async () => {
      chow.addHelpers({ jsonBody: true })

      let body = null
      chow.route('post', '/', (ctx) => {
        body = ctx.request.body
      })

      await request(chow.app)
        .post('/')
        .send('{"name":"Geoff","age":42}')
        .set('Content-Type', 'application/json')

      expect(body).toEqual({
        name: 'Geoff',
        age: 42,
      })
    })

    it('should enable url encoded body parsing', async () => {
      chow.addHelpers({ urlEncodedBody: true })

      let body = null
      chow.route('post', '/', (ctx) => {
        body = ctx.request.body
      })

      await request(chow.app)
        .post('/')
        .send('name=Geoff&age=42')
        .set('Content-Type', 'application/x-www-form-urlencoded')

      expect(body).toEqual({
        name: 'Geoff',
        age: '42',
      })
    })

    it('should add cors headers', async () => {
      chow.addHelpers({ corsHosts: 'http://localhost:8080' })

      chow.route('get', '/', (ctx) => 'hello')

      const res = await request(chow.app).get('/')

      expect(res.header['access-control-allow-origin']).toEqual(
        'http://localhost:8080'
      )
    })

    it('should enable trust proxy', async () => {
      chow.addHelpers({ trustProxy: true })

      let host, proto, ip
      chow.middleware((app) => {
        app.use((req, res, next) => {
          host = req.hostname
          ip = req.ip
          proto = req.protocol
          next()
        })
      })

      chow.route('get', '/', (ctx) => 'hello')

      const res = await request(chow.app)
        .get('/')
        .set('X-Forwarded-Host', 'someapp.dev')
        .set('X-Forwarded-Proto', 'https')
        .set('X-Forwarded-For', '000.000.000.000')

      expect(res.status).toEqual(200)

      expect({ host, proto, ip }).toEqual({
        host: 'someapp.dev',
        proto: 'https',
        ip: '000.000.000.000',
      })
    })
  })

  describe('#start', () => {
    beforeEach(() => {
      chow.server.listen = jest.fn((port, resolve) => resolve()) as any
    })

    it('should start the http server', async () => {
      await chow.start({ port: 1234 })

      expect(chow.server.listen).toBeCalledWith(1234, expect.any(Function))
    })

    it('should handle 404 errors when enabled', async () => {
      await chow.start({ handle404s: true })

      const res = await request(chow.app).get('/')

      expect(res.status).toEqual(404)
    })
  })

  describe('#stop', () => {
    it('should stop the server', async () => {
      chow.server.close = jest.fn((cb) => cb(null)) as any

      await chow.stop()

      expect(chow.server.close).toBeCalled()
    })

    it('should throw any errors', async () => {
      const err = new Error()
      chow.server.close = jest.fn((cb) => cb(err)) as any

      expect(chow.stop()).rejects.toEqual(err)
    })
  })
})
