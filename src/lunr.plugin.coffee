lunrdoc = require('./lunrdoc')

# Export Plugin
module.exports = (BasePlugin) ->
  # Define Plugin
  class LunrPlugin extends BasePlugin
    # Plugin name
    name: 'lunr'
    # Provide some helper functions
    extendTemplateData: ({templateData}) ->
      lunrdoc.init(@docpad)
      # helper functions for printing input boxes
      templateData.getLunrSearchPage = (index, placeholder) ->
        return lunrdoc.getLunrSearchPage(index, placeholder)
      templateData.getLunrSearchBlock = (searchPage, placeholder, submit) ->
        return lunrdoc.getLunrSearchBlock(searchPage, placeholder, submit)

    # hook into the writeAfter event for generating the index/files
    writeAfter: ->
      _indexDocument = (collection) ->
        indexCollection = @docpad.getCollection(collection)
        if indexCollection
          indexCollection.forEach (document) ->
            lunrdoc.index indexName, document

        return

      if (@config.indexes)
        for indexName, index of @config.indexes
          if Array.isArray(index.collection)
            index.collection.forEach (collection) ->
              _indexDocument collection
              return
          else
            _indexDocument(index.collection)
        lunrdoc.save()
