import { HttpResponse, HttpMessage, HttpRedirect, createRequest } from '../http'

describe('HttpResponse', () => {
  describe('#constructor', () => {
    it('should store properties', () => {
      let response = new HttpResponse(419, 'Some body', {
        some: 'header',
      })

      expect(response.status).toEqual(419)
      expect(response.body).toEqual('Some body')
      expect(response.headers).toEqual({ some: 'header' })
    })
  })
})

describe('HttpMessage', () => {
  describe('#constructor', () => {
    it('should store properties', () => {
      let message = new HttpMessage(200, 'All ok')

      expect(message.status).toEqual(200)
      expect(message.body).toEqual({ message: 'All ok' })
    })
  })
})

describe('HttpRedirect', () => {
  describe('#constructor', () => {
    it('should set the location header', () => {
      let redir = new HttpRedirect('https://duck.com')

      expect(redir.status).toEqual(302)
      expect(redir.body).toEqual('')
      expect(redir.headers).toEqual({
        location: 'https://duck.com',
      })
    })
    it('should return a 301 for permenant redirects', () => {
      let redir = new HttpRedirect('https://duck.com', true)
      expect(redir.status).toEqual(301)
    })
  })
})

describe('#createRequest', () => {
  it('should create a ChowRequest', () => {
    const rawRequest: any = {
      params: { id: '1' },
      headers: { 'content-type': 'application/json' },
      query: { search: 'term' },
      body: { name: 'Geoff', age: 42 },
    }

    const result = createRequest(rawRequest)

    expect(result).toEqual({
      params: { id: '1' },
      headers: { 'content-type': 'application/json' },
      query: { search: 'term' },
      body: { name: 'Geoff', age: 42 },
    })
  })
})
