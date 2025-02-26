# Dependency Cleanup Guide

This is a small guide to help you understand how to check for unused dependencies in the project.

### Recommendations / Prerequisites

- Make sure you have set up and can run the app locally before starting this process, if not, check the `README` file.
- Create a backup of the `package.json` and `package-lock.json` files

### Unused Dependecies

> Note: I'd recommend when possible checking manually all the dependencies in the package.json file against the files (ts, tsx, config files, etc) since some tools out there could give you some false positives, however, tools like [depcheck](https://www.npmjs.com/package/depcheck) could also save you some time.

Install depcheck globally

```bash
npm install -g depcheck
```

Run dependency check

```bash
depcheck
```

As mentioned in the note, you can get some false positives from these tools. For example, for this project I got that all of these were unused dependencies

```
Unused devDependencies
* @types/node
* eslint
* eslint-config-next
* postcss
* typescript
```

Notice that some of them shouldn't be on that list since they are essential for the functioning of this application.
So, after getting a second opinion from my good friend the AI (used Claude-3.5-sonnet), it was smart enough to suggest explain why some of them were necessary and why some of them could be removed
So, after this, I decided to leave:

```
@types/node -> Required for Typescript type definition in a Next.js app
postcss     -> Required by Tailwind
typescript  -> Essential for a TypeScript Next.js project
```

> Note: A file named `.depcheckrc` was added with all the dependencies we want `depcheck` to 'ignore' from the unused dependencies list, this will avoid someone having to go through this again in the future. Check out the documentation for more options.

And removed the `eslint` related dependencies and configuration files since we are making use of [biome](https://www.npmjs.com/package/@biomejs/biome/) as our linter

```
Dependencies uninstalled:
- eslint
- eslint-config-next
- @eslint/eslintrc

Configuration files removed:
- eslint.config.mjs
```

Finally, once all of this was done, go and check that the tests are running, and the apps loads and works as expected.
