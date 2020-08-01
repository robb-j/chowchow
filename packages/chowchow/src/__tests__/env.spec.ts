import { makeEnv } from '../env'

//
// WARNING - this test manipulates process.env!
// For now, this is safe as it is the only test to use it
//

describe('#makeEnv', () => {
  beforeEach(() => {
    process.env.APP_NAME = 'fantastic-app'
  })
  it('should return an object with the desired env', () => {
    let env = makeEnv(['APP_NAME'])

    expect(env).toEqual({
      APP_NAME: 'fantastic-app',
    })
  })
})
