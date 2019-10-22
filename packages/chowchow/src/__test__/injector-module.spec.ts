import { InjectorModule } from '../injector-module'

describe('InjectorModule', () => {
  const payload = { name: 'geoff' }

  describe('#checkEnvironment', () => {
    it('should check for required variables', () => {
      let injector = new InjectorModule(() => payload, ['NAME'])
      let check = () => injector.checkEnvironment()
      expect(check).toThrow()
    })
  })

  describe('#setupModule', () => {
    it('should generate and store the value', async () => {
      let injector = new InjectorModule(() => payload, ['NAME'])
      await injector.setupModule()
      expect(injector.value).toEqual(payload)
    })
  })

  describe('#clearModule', () => {
    it('should reset the value', () => {
      let injector = new InjectorModule(() => payload, ['NAME'])
      injector.value = payload

      injector.clearModule()

      expect(injector.value).toBeUndefined()
    })
  })

  describe('#extendEndpointContext', () => {
    it('should return the value', () => {
      let injector = new InjectorModule(() => payload, ['NAME'])
      injector.value = payload

      let result = injector.extendEndpointContext()

      expect(result).toEqual(payload)
    })
  })
})
