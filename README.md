# @aw-webflow/pricing_page_js

Custom JavaScript for a Webflow page.

## Usage via jsDelivr CDN

Add the following script tag to your Webflow page (before `</body>`):

```html
<script src="https://cdn.jsdelivr.net/npm/@aw-webflow/pricing_page_js@1.0.0/script.min.js"></script>
```

## Deployment Workflow

1. Push your changes to GitHub.
2. Bump the version in `package.json`.
3. Publish to npm: `npm publish --access public`.
4. Update the version in the Webflow `<script>` tag to point to the new release.

## Local Development

```bash
npm install
npm start
```

`npm start` runs `parcel script.js` for local bundling and development.
