# DocPad Lunr Plugin
Generates [Lunr](http://lunrjs.com) search indexes from your Docpad collections, and provides helpers for a client-side full-text and faceted search.

## Getting Started

```
npm install --save docpad-plugin-lunr
```
or
```
docpad install lunr
```

Configure a collection to index in your `docpad.coffee`:
```coffee
plugins:
  lunr:
    indexes:
      myIndex:
        collection: 'myCollection'
```
To create an index which includes multiple collections you can pass an array of collection names:
```coffee
plugins:
  lunr:
    indexes:
      myIndex:
        collection: ['firstCollection','secondCollection']
```

Make your search page itself, eg `my-search-page.html.eco`:
```eco
<%- @getLunrSearchPage('myIndex') %>
```

Make a "search bar" on other pages that redirects users to your search page above, like in a layout, eg. `default.html.eco`:
```eco
<%- @getLunrSearchBlock('my-search-page.html') %>
```

## Customization

To control the fields that get indexed and their "boost" levels (ie, relevance), add to the index's configuration in `docpad.coffee`:
```coffee
indexFields: [
  {name: "body", boost: 1}
  {name: "title", boost: 10}
  {name: "tags", boost: 100}
]
```

To control the fields that are available in search results, add to the lunr configuration in `docpad.coffee`:
```coffee
contentFields: [
  {name: "title"}
  {name: "url"}
  {name: "date"}
]
```

For faceted search, add to the lunr configuration in `docpad.coffee`:
```coffee
facetFields: [
  {name: "tags", label: "Filter by tag"}
  {name: "type", label: "Filter by type"}
]
```
(Note: the faceted search is not part of Lunr, just my own poor-man's version. Also, you may want to put in a bit of CSS to highlight the "active" facet filters, such as: `<style>.active:after{content:'*';}</style>`.)

To provide an Eco template for the search-results, add to the lunr configuration in `docpad.coffee`:
```coffee
resultsTemplate: 'src/partials/teaser.html.eco'
```
Then in `src/partials/teaser.html.eco`:
```eco
<div>
  <a href="<%= post.url %>"><%= post.title %></a>
  <span>posted on <%= post.date %></span>
</div>
```

Or provide a template function for search results directly in `docpad.coffee`:
```coffee
resultsTemplate: (context) ->
  post = context.post
  return """
  <div>
    <a href="#{post.url}">#{post.title}</a>
    <span>posted on #{post.date}</span>
  </div>
  """
```

To add your own "stopwords" to prevent certain words from being indexed, add to the index's configuration in `docpad.coffee`
```coffee
stopWords: ['an','array','of','words']
```

## Advanced usage

If you want to make your own UI (and your own implementation of facets), here are the basics:

```html
<script src="/lunr/lunr.min.js" type="text/javascript"></script>
<script src="/lunr/lunr-data-myindex.js" type="text/javascript"></script>
<script type="text/javascript">
  lunrdoc.idx = lunr.Index.load(lunrdoc.indexJson);
  var results = lunrdoc.idx.search('this is your user input');
  for (var i in results) {
    var itemData = lunrdoc.content[results[i].ref];
    console.log(itemData);
    var renderedItem = lunrdoc.template({post: itemData});
    console.log(renderedItem);
  }
</script>
```

## Future

* Currently this plugin is geared towards static sites, and brings everything client-side. Need to allow for dynamic sites to take advantage of having a back-end - ie, keep the index, searching, and content on the back-end.
* Hopefully if faceted search is added to Lunr proper, re-implement using that
* Failing that, add more facet types, like dates and numeric ranges
* Allow for custom pipeline functions
