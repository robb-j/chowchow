# Unit testing with ChowChow

ChowChow doesn't (currently) provide any testing integrations to remain agnostic,
but it is quite easy to stub out methods so you can test with your favourite testing library.

ChowChow explicitly separates the starting & stopping of the internal express server
so you can create your own subclass and override those methods.

## An example

As an example using the [supertest](https://www.npmjs.com/package/supertest)
and [jest](https://www.npmjs.com/package/jest) libraries
you could create a ChowChow subclass like:

```ts
// src/MockChowChow.ts

import { ChowChow, BaseContext } from '@robb_j/chowchow'
import supertest from 'supertest'

// A custom ChowChow instance which stops the express server
// and creates a superagent agent for use in testing
export class MockChowChow extends ChowChow<BaseContext> {
  agent = supertest(this.expressApp)

  // Override these and to not actually start express
  protected async startServer() {}
  protected async stopServer() {}
}
```

Then you have a route like:

```ts
// src/routes.ts

import { BaseContext } from '@robb_j/chowchow'

// A very base 'hello world' endpoint, to get the point across
export function helloRoute({ res }: BaseContext) {
  res.send('Hello, World!')
}
```

And a server like this:

```ts
// src/server.ts

import { ChowChow, BaseContext } from '@robb_j/chowchow'
import { helloRoute } from './routes'

// A method to create a new ChowChow server and apply middle/routes/handlers
export function createServer() {
  let chow = ChowChow.create<BaseContext>()
  setupServer(chow)
  return chow
}

// A separate method to apply middle/routes/handlers to any ChowChow instance
export function setupServer(chow: ChowChow<BaseContext>) {
  chow.applyRoutes((app, r) => {
    app.get('/', helloRoute)
  })
}
```

Then you can write a test like this:

```ts
// src/__test__/routes.ts

describe('GET: /', () => {
  let chow = new MockChowChow()

  beforeAll(() => {
    setupServer(chow)
  })

  beforeEach(async () => {
    await chow.start()
  })

  afterEach(async () => {
    await chow.stop()
  })

  it('should return a message', async () => {
    let res = await chow.agent.get('/')
    expect(res.status).toBe(200)
    expect(res.body).toBe('Hello, World!')
  })
})
```

## Some notes

There are a couple of things to consider when testing ChowChow

- You don't want to actually start an express server, this introduces http inconsistencies
- The setup of your server shouldn't have external side-effects, e.g. modifying anything other than `chow`
- The best way I've found is to have the 2 method approach in `server.ts`, once method to create a server and another to 'decorate' it to add routes and etc. This means you can inject your own `ChowChow` mock instance.
- You could create a new `MockChowChow` for every test if you want to ensure there are no side effects.

When deciding how to test ChowChow I toyed with the idea of being able to
call your endpoints directly (maybe with a small wrapper).
I decided against this because you want your unit tests to be directly related to the route they will be served at.
If you abstract away from the route you then have to test the routing separately
and you need to do extra work to prove the endpoint you expect is routed correctly.
