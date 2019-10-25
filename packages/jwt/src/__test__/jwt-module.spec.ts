import { mocked } from 'ts-jest/utils'
import { checkVariables } from 'valid-env'
import jsonwebtoken from 'jsonwebtoken'

import { JwtModule, JwtContext } from '../jwt-module'

jest.mock('valid-env')

describe('JwtModule', () => {
  let jwt: JwtModule

  beforeEach(() => {
    jwt = new JwtModule()
  })

  describe('#checkEnvironment', () => {
    it('should require JWT_SECRET', async () => {
      jwt.checkEnvironment()

      expect(mocked(checkVariables)).toBeCalledWith(['JWT_SECRET'])
    })
  })

  describe('#extendEndpointContext', () => {
    let ctx: JwtContext

    beforeEach(() => {
      jwt.secret = 'top_secret'
      ctx = jwt.extendEndpointContext(null as any)
    })

    describe('#verifyJwt', () => {
      it('should verify the jwt and return it', () => {
        let payload = { typ: 'hey', msg: 'Hello' }
        let token = jsonwebtoken.sign(payload, 'top_secret')

        let [err, result] = ctx.verifyJwt(token)

        expect(err).toBe(undefined)
        expect(result).toEqual({
          iat: expect.any(Number),
          ...payload
        })
      })
      it('should return any errors', () => {
        let token = 'some_bad_token'

        let [err, result] = ctx.verifyJwt(token)

        expect(err).toBeInstanceOf(Error)
        expect(result).toBe(undefined)
      })
    })

    describe('#signJwt', () => {
      it('should return a signed jwt', () => {
        let payload = { typ: 'hey', msg: 'Hello' }
        let token = ctx.signJwt(payload)

        expect(token).toEqual(expect.any(String))

        let result = jsonwebtoken.verify(token, 'top_secret')
        expect(result).toEqual({
          iat: expect.any(Number),
          ...payload
        })
      })
    })
  })
})
