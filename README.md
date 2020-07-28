# ChowChow

A typed functional wrapper for express to build testable servers.

[![CircleCI](https://circleci.com/gh/robb-j/chowchow.svg?style=svg)](https://circleci.com/gh/robb-j/chowchow)

<!-- toc-head -->

## Table of contents

- [Documentation](#documentation)
- [Why ChowChow](#why-chowchow)
- [Instillation](#instillation)
- [Concepts](#concepts)
  - [Environment](#environment)
  - [Context](#context)
  - [Routes](#routes)
  - [Events](#events)
  - [Services](#services)
- [Ideas / future work](#ideas--future-work)

<!-- toc-tail -->

## Documentation

- [Guide](/docs/guide.md)
- [API reference](/docs/api.md)
- [Testing](/docs/testing.md)
- [Deployment](/docs/deployment.md)
- [Development](/docs/development.md)

## Why ChowChow

ChowChow is all about making developing and testing a node.js server as fast and easy as possible.
It is a framework for making a strongly-typed express where the codebase scales well and is easily testable.

## Instillation

```bash
# Add the dependency
npm install @robb_j/chowchow
```

## Concepts

- [Environment](#environment)
- [Context](#context)
- [Routes](#routes)
- [Events](#events)
- [Services](#services)

### Environment

The **environment** is an imutable object of configuration
which is available in every place where you need it.
For example, a database connection string or an API token.

**env.ts:**

```ts
// Defined as a type so it can easily be passed around and re-used
interface Env {
  MONGO_URL: string
  JWT_SECRET: string
  SELF_URL: string
}

// An instance of the environment
const env = {
  MONGO_URL: 'mongodb://user:secret@localhost:27017',
  JWT_SECRET: 'top_secret',
  SELF_URL: 'http://localhost:3000',
}
```

<details>
<summary>Or from <code>process.env</code></summary>

```ts
export type Env = ReturnType<typeof createEnv>

export function createEnv(env: Record<string, string> = process.env) {
  const { MONGO_URL, JWT_SECRET, SELF_URL } = process.env
  return { MONGO_URL, JWT_SECRET, SELF_URL }
}
```

> You could use something like [valid-env](https://www.npmjs.com/package/valid-env)
> to check environment variables are set

</details>

### Context

A ChowChow server is based around a context object which you provide a function to create.
For example, you might want to add a database client or some custom shared logic.

**server.ts:**

```ts
import { Chow } from '@robb_j/chowchow'

// The context type
export interface Context {
  greet(name: string): string
}

// Create a new chow with an environment and a function to generate our context
// (the generator can be async)
const chow = new Chow<Env, Context>(env, async () => ({
  greet: (name) => `Hello, ${name}`,
}))
```

With your `Env` and `Context` defined, you can export that type for easy imports later

**server.ts:**

```ts
import { Chow, Chowish } from '@robb_j/chowchow'

// Export a typed version of chow to easily import it elsewhere
export type TypedChow = Chowish<Env, Context>
```

### Routes

Routes are the endpoints of your server, the reason you're making a node app.
These are a method which takes a freshly generated **context** and a `request` object.
Then whatever your function returns is sent as the route's response.

**routes/hello.ts:**

```ts
// Not you can import your TypedChow to easily register routes
// which have your typed Env and Context already set
import { TypedChow } from '../server'

export default function helloRoute(chow: TypedChow) {
  // Create our route
  // - ctx is typed as our Context
  // - can be async
  // - A full Context is passed plus a "request" object
  chow.route('get', '/hello', async (ctx) => {
    const { name = 'Geoff Testington' } = ctx.request.query
    const message = ctx.greet(name)
    return { message }
  })
}
```

Then you'll want to register your route using the apply function:

**server.ts**

```ts
import helloRoute from './routes/hello'

// ...

chow.apply(helloRoute)
```

<details>
<summary>wip idea ...</summary>

```ts
// Something like this could make importing routes a lot easier
// Not realy code, just an idea for now
chow.magicApply('routes/**/*.ts')
```

</details>

### Events

To facilitate side-effects you define & trigger **events**
which are handled outside of your **route** logic.

**events/email.ts:**

```ts
import { TypedChow } from '../server'

// Define the event so it cannot be emitted incorrectly
// - "name" enforces how you emit it
// - "payload" enforces what is emitted
export interface EmailEvent {
  name: 'email'
  payload: {
    to: string
    subject: string
    body: string
  }
}

export default function emailEvent(chow: TypedChow) {
  // Register our event
  // - 'email' must be passed to satisfy our type
  // - can be async
  // - A full Context is passed plus an "event" object
  chow.event<EmailEvent>('email', async (ctx) => {
    const { to, subject, body } = ctx.event.payload
    const message = ctx.greet(to)

    // ... some code to actually send an email
  })
}
```

**server.ts**

```ts
import emailEvent from './events/email'

// ...

chow.apply(emailEvent)
```

`emit` is added to your context to emit a side effect, like below

**routes/hello.ts:**

```ts
import { EmailEvent } from '../events/email.ts'

chow.route('get', '/test/email', async (ctx) => {
  // Pass the generic type too to ensure safety
  // -> Can only pass 'email'
  // -> Must pass to, subject & body too
  ctx.emit<EmailEvent>('email', {
    to: 'user@example.com,
    subject: 'Test email',
    body: 'Lorem ipsum ...'
  })
})
```

### Services

To integrate with apis or databases add **services** to your **context**.
Services should aim to be [pure functions](https://en.wikipedia.org/wiki/Pure_function)
and **events** should hande [side effects](<https://en.wikipedia.org/wiki/Side_effect_(computer_science)>).
i.e. **services** should be more computational and **events** handle mutation and changes,
like sending an email or triggering a webhook.

> Services are more of a logical grouping rather than something explicitally
> defined in ChowChow (like a route or event)

**services/mongo.ts:**

```ts
import { MongoClient } from 'mongodb'

export interface User {
  // ...
}

// Define the service and what it does
export interface MongoService {
  getUsers(): Promise<User[]>
  close(): Promise<void>
}

// A method to generate a client
export async function createMongoService(mongoUrl: string) {
  const client = new MongoClient(mongoUrl)
  await client.connect()

  return {
    async getUsers() {
      //
      // some mongodb query to get and return users
      //
    },
    close() {
      await client.close()
    },
  }
}
```

They you can use a service like this:

**server.ts:**

```ts
import { MongoService, createMongoService } from './services/mongo.ts'

interface Context {
  mongo: MongoService
}

const mongo = await createMongoService(env.MONGO_URL)

const chow = new Chow<Env, Context>(env, () => {
  return { mongo }
})
```

## Ideas / future work

- Make error handling user-customisable for events & routes
- Make route result handling user-customisable
- Add socket.io package "sockchow"
- Make `env` immutable
- Experiment with "magicApply" to auto-register Chower functions
