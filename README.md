# Chow Chow

A modular express wrapper for writing Typescript servers.

[![CircleCI](https://circleci.com/gh/robb-j/chowchow.svg?style=svg)](https://circleci.com/gh/robb-j/chowchow)

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
  await chow.start({ port: 1337, verbose: true })
  console.log('Listening on :1337')

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
  app!: ChowChow // Automatically set by ChowChow when applied

  // An optional custom constructor to create your module
  constructor(public config: SampleConfig) {}

  // A hook to throw errors if not configured
  // e.g. Check the config or that environment variables are set
  checkEnvironment() {}

  // Called once all #checkEnvironment calls pass to setup the module
  setupModule() {}

  // Called when chowchow is stopped and to tidy up the module
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
