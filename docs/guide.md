# ChowChow Guide

> WIP

<!-- toc-head -->

## Table of contents

<!-- toc-tail -->

## What is ChowChow?

ChowChow is a modern (circa 2020) TypeScript framework for building node.js servers.
It was built from a need to have a more strongly typed server which was modular
and easy to test.
There are 5 components that make up a ChowChow server:

- The **Environment** - a set of values and secrets to configure the server
- A **Context** - a strong type unique to the server where common logic is
- **Routes** - the http handlers that make up your server
- **Events** - to perform side-effects like sending emails or logging
- **Services** - are abstractions on the context to provide some functionality

## Getting started

A best practice ChowChow server follows this structure:

```
├── src/
│   ├── events/
│   ├── routes/
│   ├── services/
│   ├── entrypoint.ts
│   └── server.ts
├── package.json
├── tsconfig.json
```

- Your routes, events and services are all defined as seperate files in their own folders.
- There is an `entrypoint.ts` to start the server (it could be a cli.ts)
- It has a standard package.json as all node.js projects
- It is written in typescript and has a tsconfig.json to setup the transpiller

### Setting up the project

This guide assumes you have node.js 12 installed and have npm setup

```bash
# First setup a blank project using npm
mkdir your_new_project
cd your_new_project
npm init
```

You can roll your own tsconfig, but here is a reccomended one,

<details>
<summary><strong>tsconfig.json</strong></summary>

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "target": "es2018",
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "pretty": true,
    "newLine": "lf",
    "stripInternal": true,
    "strict": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noEmitOnError": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

</details>

### Install npm dependencies

```bash
# First install and save production dependencies
npm install @robb_j/chowchow dotenv

# Second, development dependencies
npm install -D typescript ts-node @types/node @types/express
```

### Configure the package

Add scripts to run the server and perform common tasks

```json
{
  "scripts": {
    "test": "jest",
    "coverage": "jest --coverage",
    "build": "tsc",
    "lint": "tsc --noEmit",
    "preversion": "npm run test -s && npm run build",
    "dev": "node -r ts-node/register -r dotenv/config src/entrypoint.ts",
    "debug": "node --inspect-brk -r ts-node/register -r dotenv/config src/entrypoint.ts"
  }
}
```

### Define the environment

First we'll setup and define the environment variables that configure the server,
we'll have a single file to do this.
Anything to do with setting up or getting variables can go here.

**src/env.ts**

```ts
export type Env = ReturnType<typeof createEnv>

export function createEnv() {
  const { EXAMPLE_VARIABLE = 'default value' } = process.env

  return { EXAMPLE_VARIABLE }
}
```

> You could use something like [valid-env](https://github.com/robb-j/valid-env/)
> to validate that environment variables are set

### Create a service

Let's create a service to provide some logic for our routes and events.

**src/services/greet.ts**

```ts
export interface GreetService {
  sayHello(name: string): string
}

export function createGreetService(): GreetService {
  return {
    sayHello(name) {
      return `Hello, ${name}`
    },
  }
}
```

### Create a route

Now we can create a route which uses our service.

**src/routes/hello.ts**

```ts
import { TypedChow } from '../server'

// Exort a function to setup the route
export default function hello(chow: TypedChow) {
  // Create the route
  chow.route('get', '/hello', ({ request, greet }) => {
    const { name = 'Unknown' } = request.query.name

    return greet.sayHello(name)
  })
}
```

### Create an event

We can register an event which our routes can use to emit side-effects

**src/events/email.ts**

```ts
import { TypedChow } from '../server'

// Strongly type our event
export interface EmailEvent {
  name: 'email'
  payload: {
    to: string
    subject: string
    body: string
  }
}

// Exort a function to register the event
export default function email(chow: TypedChow) {
  // Register our event
  chow.event<EmailEvent>('email', async (({ event, greet })) => {
    // These fields are typed thanks to our interface above
    const { to, subject, email } = event.payload

    // You can use your context here too
    const message = greet.sayHello(to)

    // <Some actual logic to send an email> ...
  })
}
```

### Create a server

Next we want a server file which pulls all components of the server together.

**src/server.ts**

```ts
import { Chow, Chowish } from '@robb_j/chowchow'
import { Env, createEnv } from './env'

import { GreetService, createGreetService } from './services/greet'
import helloRoute from './routes/hello'
import emailEvent from './events/email'

// This will be your server's context,
// define whatever methods you want to make available here
export interface Context {}

// Export a typed instance to make importing the type super easier elsewhere
// (We used this in routes/hello.ts)
export type TypedChow = Chowish<Env, Context>

// Export a function to setup and run the server
export async function runServer() {
  // Create an environment instance
  const env = createEnv()

  // Setup services
  const greet = createGreetService()

  // Create a context factory, responsible for making instances of our Context
  const ctxFactory = (): Context => ({
    greet,
  })

  // - pass in our configured environment
  // - create a context factory,
  const chow = new Chow(env, () => ({}))

  // Apply routes & events
  chow.apply(helloRoute, emailEvent)

  // Start the server
  await chow.start({
    outputUrl: true,
  })
}
```

### Create an entrypoint

Finally, add an entrypoint script to run the server

**src/entrypoint.ts**

```ts
import { runServer } from './server'

runServer().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

### Running the server

Now you can run the server in your terminal!

```bash
# cd to/the/project/folder

# Run the server
# -> Runs typescript directly using ts-node
# -> Listens on port 3000
# -> Automatically loads environment variables from a .env using dotenv
npm run dev

# Run and debug the server
# -> Same as "npm run dev"
# -> Turns on nodejs debugging and breaks on the first line of executing
# -> Connect a debugger (e.g. Chrome or VS Code) to resume execution
npm run debug

# Build and run in production
# -> Transpile TypeScript to JavaScript that node.js understands
# -> Run the entrypoint directly as npm-run messes up signalling logic (in containers)
npm run build
node dist/entrypoint.js
```

## Optional extras

### Having a CLI entrypoint

...

### Reccomeded tooling

**prettier**

...

**@robb_j/md-toc**

...

**@godaddy/terminus**

...

**helmet**

...

TODO:

- Having a CLI as an entrypoint
- Reccomended tooling
  - prettier + lint-staged
  - @robb_j/md-toc
  - @godaddy/terminus
  - helmet
