# A ChowChow Module

Heres what a ChowChow module looks like.

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
