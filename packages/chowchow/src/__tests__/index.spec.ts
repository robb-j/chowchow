import * as c from '../index'

describe('Package exports', () => {
  it('should export from chowchow', () => {
    expect(c.Chow).toBeDefined()
  })
  it('should export from env', () => {
    expect(c.makeEnv).toBeDefined()
  })
  it('should export from events', () => {
    expect(c.EventNotHandledError).toBeDefined()
  })
  it('should export from http', () => {
    expect(c.HttpRedirect).toBeDefined()
    expect(c.HttpMessage).toBeDefined()
    expect(c.HttpResponse).toBeDefined()
    expect(c.createRequest).toBeDefined()
  })
})
