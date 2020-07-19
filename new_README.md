# ChowChow

A typed functional wrapper for express to build testable servers.

[![CircleCI](https://circleci.com/gh/robb-j/chowchow.svg?style=svg)](https://circleci.com/gh/robb-j/chowchow)

<!-- toc-head -->
<!-- toc-tail -->

## Documentation

- [Guide](/docs/guide.md)
- [API reference](/docs/api.md)
- [Testing](/docs/testing.md)
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

The **environment** is a typed object of variables and configuration that you pass into ChowChow which is available in every place where you need it.
Any configuration you put into it should be immutable, for example you might want to put in a database connection string or an API token.

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

> You could use something like [valid-env](https://www.npmjs.com/package/valid-env) to check environment variables are set

</details>

### Context

Each ChowChow server you create has a unique type called the **context**.
You provide a function to generate an instance of your context which is used for each request or event emitted.
It has your **environment** on it by default,
then you customise it to put on your own **services**.
For example, you might want to add a database client or some custom shared logic.

**server.ts:**

```ts
import { Chow, Chowish, BaseContext } from '@robb_j/chowchow'
import { Env, createEnv } from './env'

// The context type
export interface Context extends BaseContext<Env> {
  greet(name: string): string
}

// Export a typed version of chow to easily import it elsewhere
export type TypedChow = Chowish<Env, Context>

const env = createEnv()

// Create a new chow with the env from above  and a function to generate our context
// The generator can be async
const chow = new Chow<Env, Context>(env, async (baseContext) => {
  return {
    ...baseContext,
    greet: (name) => `Hello, ${name}`,
  }
})
```

### Routes

You then define **routes** which to add logic to your server, these are a method which is passed your **context** and a `request` object. Then whatever your function returns is sent as the route's response.

**routes/hello.ts:**

```ts
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

**server.ts**

```ts
import helloRoute from './routes/hello'

// ...

chow.apply(helloRoute)
```

### Events

To facilitate side-effects you trigger **events** which are handled outside of your **route** logic and are easily stubbed out for your tests.

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

### Services

To integrate with apis or database you add **services** to your **context** which also can be stubbed out for easier unit testing.
As a guide, **services** should aim to be [pure functions](https://en.wikipedia.org/wiki/Pure_function) and **events** should hande [side effects](<https://en.wikipedia.org/wiki/Side_effect_(computer_science)>).
i.e. **services** should be more computational and **events** handle mutation and changes, like sending an email or triggering a webhook.

**services/mongo.ts:**

```ts
import { MongoClient } from 'mongodb'

export interface User {
  // ...
}

export interface MongoService {
  getUsers(): Promise<User[]>
  clost(): Promise<void>
}

export async function createMongoService(mongoUrl: string) {
  const client = new MongoClient(mongoUrl)
  await client.connect()

  return {
    async getUsers() {
      // ...
      // some mongodb query to get and return users
      // ...
    },
    close() {
      await client.close()
    },
  }
}
```

**server.ts:**

```ts
import { MongoService, createMongoService } from './services/mongo.ts'

interface Context extends BaseContext<Env> {
  mongo: MongoService
}

const mongo = await createMongoService(env.MONGO_URL)

const chow = new Chow<Env, Context>(env, (baseContext) => {
  return {
    ...baseContext,
    mongo,
  }
})
```

## More examples

### Minimal server

```ts
import { Chow } from '@robb_j/chowchow'

//
// Create an environment
//
interface Env {
  APP_NAME: string
}

//
// Define a context
//
interface Context {
  greet(name: string): string
}

//
// Create a chow instance
//
const env: Env = {
  APP_NAME: 'my-fancy-app',
}
const chow = new Chow<Env, Context>(env, (ctx) => ({
  ...ctx,
  greet: (name) => `Hello, ${name}!`,
}))

//
// Define a route
//
chow.route('get', '/hello', ({ env, request, greet }) => {
  return greet(request.query.name ?? 'Anon')
})

//
// Start the server
// - Below are the default arguments
//
await chow.start()
```

### Events

To encourage

```ts
//
// Create an interface for it
//
interface EmailEvent {
  name: 'email'
  payload: {
    to: 'string',
    subject: 'string',
    body: 'string'
  }
}

//
// Define the event handler
// - Strongly typed so you know the parameters are set
// - All Context values are set too and also typed
//
chow.event<EmailEvent>('email', ({ greet, event }) => {
  const { to, subject, body } = event.payload
  const msg = greet(to)

  // ... some actualy code to send an email ...
})

//
// Use the event in a route
//
chow.route'email', ({ emit }) => {
  emit<EmailEvent>('email', {
    to: 'user@example.com',
    subject: 'New event!',
    body: '...'
  })
})
```

## Ideas / future work

- Make error handling user-customisable for events & routes
- Make route result handling user-customisable
- Add socket.io package
- Make `env` immutable
- Experiment with "magicApply" to auto-register Chower functions
- Change contextFactory to not need to return BaseContext?
