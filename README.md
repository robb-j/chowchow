# ChowChow

A modular express wrapper for writing Typescript servers.

[![CircleCI](https://circleci.com/gh/robb-j/chowchow.svg?style=svg)](https://circleci.com/gh/robb-j/chowchow)

## Table of Contents

- [Why ChowChow](#why-chowchow)
- [How it works](#how-it-works)
- [Example app](#example-app)
- [Example Modules](#example-modules)
- [A Module](#a-module)

## Why ChowChow

ChowChow is all about getting you to developing your own endpoints as fast as possible
so you don't end up re-writing boilerplate code every time.
When you're creating something you want to be working on the code that adds unique value to your product.
The faster you can do this and iterate upon it, the more value you can add to your product.

## How it works

ChowChow bootstraps an express server to be used with [TypeScript](https://www.typescriptlang.org/)
and lets you easily write your endpoints in a typed manner.
Your route could look like this:

**routes.ts**

```ts
import { Context } from './types'

// An example ChowChow endpoint which checks authentication and queries products
export async function listProducts({ req, res, jwt, models }: Context) {
  if (!jwt) throw new Error('Bad Auth')
  const query = req.query.id ? { id: req.query.id } : {}
  res.send({ products: await models.Product.find(query) })
}
```

The idea is that you use or define your own ChowChow modules which which setup your express app and configure a `ctx`.
The `ctx` is what is passed to your endpoints and **only** has the `req`, `res` and `next` of express by default.

The modules you add then modify the `ctx` to add custom functionality and values.
The key part is you define your `ctx` type and use that when writing endpoints,
this lets you easily access properties on it and maintain types.

**types.ts**

```ts
import { BaseContext } from '@robb_j/chowchow'
import { LoggerContext } from '@robb_j/chowchow-logger'
import { AuthContext } from '@robb_j/chowchow-auth'
import { CustomContext } from './your_custom_module_here'

export type Context = BaseContext & LoggerContext & AuthContext & CustomContext
```

You must then add those modules to chowchow when you create it, then you're set to use them.
The modules are responsible for augmenting your `ctx` with the values from their type.

**app.ts**

```ts
import { Context } from './types'

import { LoggerModule } from '@robb_j/chowchow-logger'
import { AuthModule } from '@robb_j/chowchow-auth'
import { CustomModule } from './your_custom_module_here'

// App entry point (a self-running async arrow-function)
;(async () => {
  let chow = ChowChow.create<Context>()
    .use(new LoggerModule(…))
    .use(new AuthModule(…))
    .use(new CustomModule(…))

  // Add routes (see below) ...

  // Start up your server
  await chow.start()
})()
```

You can then register your endpoints with `applyRoutes`,
you pass a function which is called with two arguments:

- `app` is just the express app which you do whatever you like with
- `r` is a function which converts your ChowChow endpoints into express ones

> NOTE: Your function will not be executed until you call `chow.start()`

```ts
import * as routes from './routes'

chow.applyRoutes((app, r) => {
  app.get('/products', r(routes.listProducts))
})
```

ChowChow also adds a handy wrapper for handling errors, so you easily listen to errors with the same `ctx` that you use in your endpoints.
You can add as many of these as you like and they will be called in the order you add them.

```ts
chow.applyErrorHandler((err, ctx) => {
  if (err instanceof SomeError) ctx.res.send('SomeError happened')
  else ctx.res.status(400).send('Its broke')
})
```

## Example app

Here's an example app which uses ChowChow and a custom module `SomeModule.ts`
so you can see how it all fits together

```ts
import { ChowChow, BaseContext } from '@robb_j/chowchow'
import { SomeModule, SomeContext } from './SomeModule'

// Define your context based on the modules you use
// ... think 'adding your models to the context'
type Context = BaseContext & SomeContext

// Create your routes with your context and easily destructure the context
const yourRoute = async ({ res }: Context) => {
  res.send({ msg: 'Hey!' })
}

// Any errors get caught for your error handlers, even async ones
const errorRoute = async (ctx: Context) => {
    throw new Error('Oops')
  }

  // App entrypoint
;(async () => {
  // Create an instance and apply modules
  let chow = ChowChow.create<Context>()
  chow.use(new SomeModule({ anyArbitrary: 'config' }))

  // Apply your routes straight to express, using the converter function 'r'
  chow.applyRoutes((app, r) => {
    app.get('/', r(yourRoute))
    app.get('/error', r(errorRoute))
  })

  // Easily handle errors with the same strongly-typed context object
  chow.applyErrorHandler((err, ctx) => {
    if (err instanceof SomeError) ctx.res.send('SomeError happened')
    else ctx.res.status(400).send('Its broke')
  })

  // Then just start it up, with optional arguments
  await chow.start({ port: 1234, verbose: true })
  console.log('Listening on :1234')

  // You can stop at any point and it'll cleanly close the http.Server
  await chow.stop()
})()
```

## Example Modules

Modules have hooks to configure the express server, add middleware and modify the context object.

- Logging module to adds a log object to the context
- I18N module to adds an i18n object to the context
- Mongoose module, adds your models to the context

## A Module

```ts
import { ChowChow, Module, BaseContext } from '@robb_j/chowchow'
import { Application } from 'express'

// How the module modifies the context
export type SampleContext = {}

// The configuration for the module, useful as an exported type
export type SampleConfig = {}

export class SampleModule implements Module {
  app: ChowChow = null as any // Automatically set by ChowChow when applied

  // An optional custom constructor to create your module
  constructor(public config: SampleConfig) {}

  // A hook to throw errors if not configured
  // e.g. Check the config or that environment variables are set
  checkEnvironment() {}

  // Called once all #checkEnvironment calls pass to setup the module
  setupModule() {}

  // Called when ChowChow is stopped and to tidy up the module
  clearModule() {}

  // This hook allows the module to configure express, ran in the order modules are applied
  extendExpress(app: Application) {}

  // Override point for extending the context, called for each request
  // -> Its passed to current context and is expected to return its own modifications
  // -> Forcing the return type means the module complies with whats expected of it
  extendEndpointContext(ctx: BaseContext): SampleContext {
    return { yourExtra: 'things' }
  }
}
```
