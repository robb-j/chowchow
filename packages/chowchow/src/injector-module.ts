import { ChowChow, Module } from './chowchow'
import { checkVariables } from 'valid-env'

export class InjectorModule<T extends object> implements Module {
  app: ChowChow = null as any
  value: T = null as any

  constructor(
    public generator: () => Promise<T> | T,
    public env: string[] = []
  ) {}

  checkEnvironment() {
    checkVariables(this.env)
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
