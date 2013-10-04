# DocPad Lunr Plugin
Generates a Lunr search index from your Docpad collection, and provides helpers for a client-side full-text and faceted search.

## Getting Started

```
npm install --save docpad-plugin-lunr
```

Configure a collection to index in your `docpad.coffee`:

```coffee
plugins:
  lunr:
    collection: 'posts'
```

On your search page, eg `search.html.eco`:

```eco
<%- @getLunrSearchPage() %>
```

On your other pages, like in a layout, eg. `default.html.eco`:

```eco
<%- @getLunrSearchForm() %>
```

## Customization

