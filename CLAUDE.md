# CLAUDE.md

## Project Overview

Custom JavaScript for a Webflow page. The code lives in `script.js` and is published to npm as the scoped package `@aw-webflow/pricing_page_js`. It is consumed in Webflow via the jsDelivr CDN, which serves the published npm package directly.

## Coding Conventions

- All code must use `var` and ES5 syntax for maximum browser compatibility. Do not use `let`, `const`, arrow functions, template literals, or other ES6+ features in `script.js`.

## Deployment

1. Push changes to GitHub.
2. Publish to npm: `npm publish --access public` (bump the version in `package.json` first).
3. jsDelivr automatically serves the published package from the npm registry.
