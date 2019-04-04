# Notes on developing ChowChow itself

ChowChow is written in [TypeScript](https://www.typescriptlang.org/)
and is published through [npm](https://www.npmjs.com)
and of course follows [semantic versioning](https://semver.org/).

## Setup

To develop on this repo you will need to have [node.js](https://nodejs.org)
and [npm](https://www.npmjs.com) installed on your dev machine and have an understanding of them.
This guide assumes you have the repo checked out and are on macOS, but equivalent commands are available.

You'll only need to follow this setup once for your dev machine.

```bash
# Clone the repo
git clone git@github.com:robb-j/chowchow.git

# Install dependancies
npm install
```

## Regular use

These are the commands you'll regularly run to develop the package, in no particular order.
You should follow TDD (Test Driven Development), so every change should have a test.

```bash
# Run unit tests
# -> Looks for files named `*.spec.ts` in the src directory
npm run test

# Run unit tests and generate code coverage
# -> Uses the same glob as `npm run test`
npm run coverage
```

### Irregular use

These are commands you might need to run but probably won't, also in no particular order.

```bash
# Generate the table of contents for this readme
# -> It'll replace content between the toc-head and toc-tail HTML comments
npm run gen:toc

# Manually lint code with TypeScript's `tsc`
npm run lint

# Manually format code
# -> This repo is setup to automatically format code on git-push
npm run prettier

# Manually trans-pile TypeScript to JavaScript
# -> Writes files to dist
npm run build
```

## Code formatting

This repo uses [Prettier](https://prettier.io/) to automatically format code to a consistent standard.
This works using the [husky](https://www.npmjs.com/package/husky)
and [lint-staged](https://www.npmjs.com/package/lint-staged) packages to
automatically format code whenever you commit code.
This means that code that is pushed to the repo is always formatted to a consistent standard.

You can manually run the formatter with `npm run prettier` if you want.

Prettier is slightly configured in [.prettierrc.yml](/.prettierrc.yml)
and also ignores files using [.prettierignore](/.prettierignore).

## Testing

This repo uses [unit tests](https://en.wikipedia.org/wiki/Unit_testing) to ensure that everything is working correctly, guide development, avoid bad code and reduce defects.
The [Jest](https://www.npmjs.com/package/jest) package is used to run unit tests.
Tests are any file in `src/` that end with `.spec.ts`, by convention they are inline with the source code,
in a parallel folder called `__tests__`.

```bash
# Run the tests
npm test -s

# Generate code coverage
npm run coverage -s
```

## Deployment

To deploy a new version of the package run:

```bash
# Create a new version of the package
# -> You should be on the master branch
# -> You should have no un-staged changes
# -> This will run unit tests and trans-pile TypeScript to JavaScript
npm version # patch | minor | major

# Publish your new version
npm publish
```
