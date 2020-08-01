# Public API

<!-- toc-head -->

## Table of contents

- [Chow](#chow)
  - [env](#env)
  - [makeContext](#makecontext)
  - [event](#event)
  - [emit](#emit)
  - [route](#route)
  - [middleware](#middleware)
  - [apply](#apply)
  - [addHelpers](#addhelpers)
  - [start](#start)
  - [stop](#stop)
- [EventNotHandledError](#eventnothandlederror)
- [HttpResponse](#httpresponse)
- [HttpMessage](#httpmessage)
- [HttpRedirect](#httpredirect)
- [createRequest](#createrequest)
- [makeEnv](#makeenv)

<!-- toc-tail -->

> WIP

TODO:

## Chow

### env

Access the environment the server is running in.

```ts
chow.env
```

### makeContext

Generate a fresh context to be used to handle a request or event.

```ts
const ctx = await chow.makeContext()
```

### event

Register a new type of event and define what to do when it is triggered.

First define an event type so you can emit the event in a typed manor.

```ts
interface SmsEvent {
  name: 'sms'
  payload: {
    to: string
    body: string
  }
}
```

Then register a handler for the event, using the type.

```ts
chow.event<SmsEvent>('sms', (ctx) => {
  // Some custom code to send an sms to a phone number
})
```

The handler is passed a fresh context object which also has an `event` on it, which is as follows.
Where the `type` is the name of the event above and the payloads are the same.

```ts
interface ChowEvent<T> {
  type: string
  payload: T
}
```

### emit

Trigger an event.
Passing a generic type is optional but it is highly reccomended,
it means that the event name is always correct and the payload must match.

```ts
chow.emit<SmsEvent>('sms', {
  to: '+4407880123456',
  to: 'Wow I just sent an sms from javascript',
})
```

### route

Register a new route on the server

> Currently only 'get', 'post', 'del' & 'patch' are supported,
> but more methods will be added in the future.

```ts
chow.route('get', '/some/path', (ctx) => {
  // some custom logic here
  return { message: 'ok' }
})
```

Anything that is returned from the handler is returned as the response to the http request.

For more control, you can return a [HttpResponse](#httpresponse) object.
Below will return a http response with a status code of 418
and a body of "I'm a teapot".

```ts
chow.route('get', '/coffee', (ctx) => {
  return new HttpResponse(418, "I'm a teapot")
})
```

There are also shorthand classes to return a simple message in json or redirect.

See [HttpRedirect](#httpredirect) and [HttpMessage](#httpmessage) for more.

```ts
chow.route('get', '/redirect', (ctx) => {
  return new HttpRedirect('https://duck.com')
})

chow.route('get', '/error', (ctx) => {
  return new HttpMessage(400, 'Something went wrong')
})
```

### middleware

A wrapper for registering express middleware.

```ts
chow.middleware((app) => {
  // Do anything you'd like with the express app
})
```

### apply

A shorthand for registering multiple route and event files.
It takes a spread argument so you can pass as many things as you'd like.

```ts
chow.apply(routeA, routeB, routeC, eventA, eventB)
```

### addHelpers

Add common things to the underlying express server.

> NOTE - call order is important, just like express.
> So call these before registering routes

```ts
chow.addHelpers({})
```

It takes an object of opt-in arguments, defined below

- `trustProxy` – tell express to trust x-forwarded headers when behind a reverse proxy
- `jsonBody` - parse json bodies onto `request.body`
- `urlEncodedBody` - parse url encoded (form data) onto `request.body`
- `corsHosts` - set to an array of hosts that are allowed to to XHR requests

To turn them all on:

```ts
chow.addHelpers({
  trustProxy: true,
  jsonBody: true,
  urlEncodedBody: true,
  corsHosts: ['https://fancy-app.io'],
})
```

### start

Start the server

```ts
await chow.start()
```

You can also pass object arguments

- `port` - set the port to run on, `3000` by default
- `handle404s` - add a generic 404 error handler
- `outputUrl` - console.log the url of the server

To configure them all:

```ts
await chow.start({
  port: 1234,
  handle404s: true,
  outputUrl: true,
})
```

### stop

Stop the server

```ts
await chow.stop()
```

## EventNotHandledError

Thrown when you emit an event which doesn't have a handler,
for future use when event handlers are customisable.

## HttpResponse

Allows your routes to return more than just content,
use this to override the status or headers of your response.

```js
const status = 200
const body = 'Hello, world!'
const headers = {}
const response = new HttpResponse(status, body, headers)

response.status // 200
response.body // 'Hello, world!'
response.headers // {}
```

## HttpMessage

Quickly return a JSON response with a status code and a message.

> `extends HttpResponse`

```js
const status = 400
const location = 'Something went wrong'
const redir = new HttpMessage(status, location)

redir.status // 400
redir.body // { message: 'Something went wrong' }
```

## HttpRedirect

Easily return a http redirect to another URL, non-permenant by default.

> `extends HttpResponse`

```js
const location = 'https://duck.com'
const redir = new HttpRedirect(location)

redir.headers // { location: 'https://duck.com' }
redir.location // 'https://duck.com'
```

## createRequest

An internal method really, converts an express request into a ChowRequest

## makeEnv

A useful method to validate a set of environment variables are set
and put them onto a typed object.
It will `process.exit(1)` if any of the variables are not set.

It uses [valid-env](https://github.com/robb-j/valid-env/) under the hood.

> Its more verbose than I'd like, typescript needs to type
> and javascript needs the values to prepare the object unfortunately

```ts
type EnvKeys = 'APP_NAME' | 'SQL_URL' | 'SOME_API_TOKEN'

const env = makeEnv<EnvKeys>(['APP_NAME', 'SQL_URL', 'SOME_API_TOKEN'])

// Not strongly typed
env.APP_NAME
env.SQL_URL
env.SOME_API_TOKEN
```
