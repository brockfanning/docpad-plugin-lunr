lunrdoc = require('./lunrdoc')

# Export Plugin
module.exports = (BasePlugin) ->
  # Define Plugin
  class LunrPlugin extends BasePlugin
    # Plugin name
    name: 'lunr'
    writeAfter: (opts) ->
      {docpad, config} = @
      indexCollection = docpad.getCollection config.collection
      if indexCollection
        lunrdoc.init(config, docpad)
        indexCollection.forEach (document) ->
          lunrdoc.index(document)
        lunrdoc.save()