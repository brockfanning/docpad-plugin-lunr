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

To control the fields that get indexed and their "boost" levels (ie, relevance), add to the lunr configuration in `docpad.coffee`:
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
(Note: the faceted search is not part of Lunr, just my own poor-man's version)

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

## Advanced usage

To get more granular here are the basics:

```html
<script src="/lunr/lunr.min.js" type="text/javascript"></script>
<script src="/lunr/lunr-data.js" type="text/javascript"></script>
<script type="text/javascript">
  lunrdoc.idx = lunr.Index.load(lunrdoc.indexJson);
  var keywords = "hopefully some of these words appear in your docpad site";
  var results = lunrdoc.idx.search(keywords);
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