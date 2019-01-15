# Chow Chow

A modular express wrapper for writing Typescript servers.

```ts
import { ChowChow, BaseContext } from '@robb_j/chowchow'
import { SomeModule, SomeContext } from './SomeModule'

// Generate your context once based on the modules you use
type Context = BaseContext & SomeContext
;(async () => {
  // Create an instance and apply modules
  let chow = ChowChow.create().use(new SomeModule({ anyArbitrary: 'config' }))

  // Write endpoints with a dynamic strongly-typed context object
  chow.applyRoutes<Context>((app, r) => {
    app.get(
      '/',
      r(ctx => {
        ctx.res.send({ msg: 'Hey!' })
      })
    )

    // Async errors are caught, ready to be handled
    app.get(
      '/error',
      r(async ctx => {
        throw new Error('Oops')
      })
    )
  })

  // Handlers errors with the same strongly-typed context object
  chow.applyErrorHandler<Context>((err, ctx) => {
    if (err instanceof SomeError) ctx.res.send('SomeError happened')
    else ctx.res.status(400).send('Its broke')
  })

  await chow.start()
  console.log('Listening on :3000')
})()
```

## Example Modules

Modules have hooks to configure the express server, add middleware and modify the context object.

The context object is passed to your endpoints so you can easily use whatever you want to put on it, in a typed manner.

- Logging module to adds a log object to the context
- I18N module to adds an i18n object to the context
- Mongoose module, adds models to the context

## A Module

```ts
import { Module, ChowChow } from '@robb_j/chowchow'
import express from 'express'

export class LoggerModule implements Module {
  app: ChowChow = null as any // Automatically set by ChowChow when applied

  constructor(public config: any) {}

  // A hook to throw errors if not configured
  // e.g. Check the correct config was passed or check environment variables are set
  checkEnvironment() {}

  // Called once all checkEnvironment's pass to setup any internal things
  setupModule() {}

  // Not currently used
  clearModule() {}

  // Once setup, allows the module to configure express however it needs
  // -> Each is ran in the order modules are applied
  extendExpress(app: express.Application) {}

  // Override point for extending the context
  // Its passed to current context and is expected to return its own modifications
  extendEndpointContext(ctx: BaseContext) {
    return { your: 'ctx' }
  }
}
```
