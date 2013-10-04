lunrdoc = require('./lunrdoc')

# Export Plugin
module.exports = (BasePlugin) ->
  # Define Plugin
  class LunrPlugin extends BasePlugin
    # Plugin name
    name: 'lunr'
    # Provide some helper functions
    extendTemplateData: ({templateData}) ->
      {config, docpad} = @
      lunrdoc.init(config, docpad)
      # helper functions for printing input boxes
      templateData.getLunrSearchPage = (placeholder) -> 
        return lunrdoc.inputForSearchPage(config, placeholder)
      templateData.getLunrSearchForm = (placeholder, action, submit) ->
        return lunrdoc.inputForOtherPages(config, placeholder, action, submit)

    # hook into the writeAfter event for generating the index/files
    writeAfter: ->
      indexCollection = docpad.getCollection(@config.collection)
      if indexCollection
        indexCollection.forEach (document) ->
          lunrdoc.index(document)
        lunrdoc.save()