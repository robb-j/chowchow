# API

<!-- toc-head -->

## Table of contents

- [Chow](#chow)
  - [baseContext](#basecontext)
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
  - [status](#status)
  - [body](#body)
  - [headers](#headers)
- [HttpMessage](#httpmessage)
- [HttpRedirect](#httpredirect)
  - [location](#location)
- [createRequest](#createrequest)

<!-- toc-tail -->

> WIP

TODO:

## Chow

### baseContext

### makeContext

### event

### emit

### route

### middleware

### apply

### addHelpers

### start

### stop

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
```

### status

Get the http status code to be returned.

[Possible values →](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)

```js
response.status // 200
```

### body

Get the body to be returned

```js
response.body // 'Hello, world!'
```

### headers

Get the headers to be returned

```js
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
```

### location

Get the location back out again

```ts
redir.location // 'https://duck.com'
```

## createRequest
