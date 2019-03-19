import { ChowChow, Module } from './ChowChow'

export class InjectorModule<T extends object> implements Module {
  app: ChowChow = null as any
  value: T = null as any

  constructor(
    public generator: () => Promise<T> | T,
    public env: string[] = []
  ) {}

  checkEnvironment() {
    let missing = this.env.filter(name => process.env[name] === undefined)
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`)
    }
  }

  async setupModule() {
    this.value = await this.generator()
  }
  clearModule() {
    delete this.value
  }
  extendExpress() {}

  extendEndpointContext(): T {
    return this.value
  }
}
