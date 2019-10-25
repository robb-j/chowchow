import { Module, ChowChow, BaseContext } from '@robb_j/chowchow'
import { Application } from 'express'
import jwt from 'jsonwebtoken'
import { checkVariables } from 'valid-env'

export type JwtContext = {
  verifyJwt<T = object>(token: string): [undefined, T] | [Error, undefined]
  signJwt(payload: object): string
}

export class JwtModule implements Module {
  app!: ChowChow
  secret!: string

  checkEnvironment() {
    checkVariables(['JWT_SECRET'])
  }

  setupModule() {
    this.secret = process.env.JWT_SECRET!
  }

  clearModule() {}

  extendExpress(app: Application) {}

  extendEndpointContext(ctx: BaseContext): JwtContext {
    return {
      verifyJwt: (token: string) => {
        try {
          return [undefined, jwt.verify(token, this.secret) as any]
        } catch (error) {
          return [error, undefined]
        }
      },
      signJwt: (payload: object) => {
        return jwt.sign(payload, this.secret)
      }
    }
  }
}
