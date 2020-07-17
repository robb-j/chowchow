import { Chow, BaseContext } from '@robb_j/chowchow'
import { mockchow, fakeRouter, makeDebugRoute } from '../mockchow'

const testEnv = {
  NUM_CARROTS: 42,
}

function greet(name: string) {
  return 'Hello ' + name
}

type TestContext = BaseContext<typeof testEnv> & {
  greet(name: string): string
}

describe('#makeDebugRoute', () => {
  it('should generate a DebugRoute', () => {
    let spy = jest.fn()
    let route = makeDebugRoute('get', '/cars/:id', spy)

    expect(route).toEqual({
      method: 'get',
      path: '/cars/:id',
      handler: spy,
      match: expect.any(Function),
    })
  })
})

let chow: Chow<typeof testEnv, TestContext>

beforeEach(() => {
  chow = new Chow(testEnv, (base) => ({ ...base, greet }))
})

describe('#fakeRouter', () => {
  it('should create a http method for mocking routes', async () => {
    const route = makeDebugRoute('get', '/test', (ctx: TestContext) =>
      ctx.greet('Geoff')
    )

    const http = fakeRouter(chow, [route])

    const result = await http('get', '/test')

    expect(result).toEqual('Hello Geoff')
  })

  it('should pass through query parameters', async () => {
    const route = makeDebugRoute<TestContext>(
      'get',
      '/test',
      (ctx) => `search=${ctx.request.query.search}`
    )

    const http = fakeRouter(chow, [route])

    const query = { search: 'pineapples' }
    const result = await http('get', '/test', { query })

    expect(result).toEqual('search=pineapples')
  })

  it('should pass through the request body', async () => {
    const route = makeDebugRoute<TestContext>('get', '/test', (ctx) => ({
      body: ctx.request.body,
    }))

    const http = fakeRouter(chow, [route])

    const body = { fruit: 'mangos' }
    const result = await http('get', '/test', { body })

    expect(result).toEqual({ body: { fruit: 'mangos' } })
  })

  it('should parse out url params', async () => {
    const route = makeDebugRoute<TestContext>(
      'get',
      '/users/:id',
      (ctx) => `id=${ctx.request.params.id}`
    )

    const http = fakeRouter(chow, [route])

    const result = await http('get', '/users/42')

    expect(result).toEqual('id=42')
  })
})

describe('#mockchow', () => {
  it('should store make the env accessible', () => {
    const mock = mockchow(chow, {})

    expect(mock.env).toEqual({
      NUM_CARROTS: 42,
    })
  })

  it('should store extras on the instance too', () => {
    const someService = {
      run: jest.fn(),
    }

    const mock = mockchow(chow, { someService })

    expect(mock.someService).toEqual(someService)
  })

  it('should override route so they can be faked', async () => {
    const mock = mockchow(chow, {})

    mock.route('get', '/test', (ctx) => `Hello, world!`)

    const result = await mock.http('get', '/test')

    expect(result).toEqual('Hello, world!')
  })

  it('should add a method to wait for event propegation', async () => {
    const mock = mockchow(chow, {})

    const spy = jest.fn()
    mock.event('test-event', spy)

    mock.emit('test-event', { name: 'geoff' })

    await mock.waitForEvents()

    expect(spy).toBeCalled()
  })

  it('should override emit on the original chow to fix route binding', () => {
    const mock = mockchow(chow, {})

    expect(jest.isMockFunction(chow.emit))
  })

  it('should wrap methods with a jest spy', () => {
    const mock = mockchow(chow, {})

    expect(jest.isMockFunction(mock.emit)).toEqual(true)
    expect(jest.isMockFunction(mock.event)).toEqual(true)
    expect(jest.isMockFunction(mock.route)).toEqual(true)
    expect(jest.isMockFunction(mock.middleware)).toEqual(true)
    expect(jest.isMockFunction(mock.apply)).toEqual(true)
    expect(jest.isMockFunction(mock.makeContext)).toEqual(true)
    expect(jest.isMockFunction(mock.emit)).toEqual(true)
  })
})
