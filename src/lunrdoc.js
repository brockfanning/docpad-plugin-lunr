var lunr = require('lunr');
var fs = require('fs');

module.exports = {
  /*
   * This instantiates the Lunr index and a container object for content
   */
  init: function(config, docpad) {
    // default config to use
    var defaults = {
      indexFields: [
        { name: 'title', boost: 10 },
        { name: 'body', boost: 1 }
      ],
      // all fields that will be displayed in the search results
      contentFields: [
        { name: 'title' },
        { name: 'url' }
      ],
      clientFiles: 'out/lunr',
      resultsTemplate: function(context) {
        var post = context.post;
        return '<div><a href="' + post.url + '">' + post.title + '</a></div>';
      }
    };
    // use defaults if necessary for required items
    for (var prop in defaults) {
      if (typeof config[prop] === 'undefined') {
        config[prop] = defaults[prop];
      }
    }
    // save some variables so we can get at them in other methods
    this.config = config;
    this.docpad = docpad;
    // create a Lunr index
    this.idx = new lunr.Index;
    // add Lunr's stopword filter and stemmer
    this.idx.pipeline.add(lunr.stopWordFilter, lunr.stemmer);
    // set up the fields for the index
    for (var i in this.config.indexFields) {
      var boost = this.config.indexFields[i].boost || 1;
      var name = this.config.indexFields[i].name;
      this.idx.field(name, { 'boost': boost });
    }
    // the document unique identifier will always be cid
    this.idx.ref('cid');
    // prep object for storing all the content of the indexed items
    this.content = {};
  },
  /*
   * This indexes one item and gathers its content
   */
  index: function(model) {
    var itemToIndex = {};
    // index all available fields for the item
    for (var i in this.config.indexFields) {
      var name = this.config.indexFields[i].name;
      if (typeof model.attributes[name] !== 'undefined') {
        itemToIndex[name] = model.attributes[name];
      }
    }
    // set the unique identifier
    itemToIndex.cid = model.cid;
    this.idx.add(itemToIndex);

    var itemForContent = {};
    // save all available content for the item
    for (var i in this.config.contentFields) {
      var name = this.config.contentFields[i].name;
      if (typeof model.attributes[name] !== 'undefined') {
        itemForContent[name] = model.attributes[name];
      }
    }
    // save it, keyed to its cid, for easy retrieval
    this.content[model.cid] = itemForContent;
  },
  /*
   * This serializes and writes to disk all data for the your client-side
   * search implementation. It copies over my own implementation as well
   * (including poor-man's facets) which you can ignore if not needed.
   */
  save: function() {
    var location = this.docpad.config.rootPath + '/' + this.config.clientFiles;
    try {
      fs.mkdirSync(location);
    } catch (err) {
      // assume it's already there
    }
    var file = fs.openSync(location + '/lunr-data.js', 'w+');
    // start the file with an object for namespacing purposes
    fs.writeSync(file, 'var lunrdoc = lunrdoc || {};');
    // append the json for the search index
    var indexJson = JSON.stringify(this.idx.toJSON());
    fs.writeSync(file, 'lunrdoc.indexJson=' + indexJson + ';');
    // append the json for the content data
    var contentJson = JSON.stringify(this.content);
    fs.writeSync(file, 'lunrdoc.content=' + contentJson + ';');
    // append, if needed, the facet data
    if (typeof this.config.facetFields !== 'undefined') {
      var facetJson = JSON.stringify(this.config.facetFields);
      fs.writeSync(file, 'lunrdoc.facets=' + facetJson + ';');
    }
    // append the client-side templating function for results
    var resultsTemplate = '';
    if (typeof this.config.resultsTemplate === 'function') {
      // if a function was passed, use that directly
      resultsTemplate = this.config.resultsTemplate.toString();
    } else if (typeof this.config.resultsTemplate === 'string' &&
      this.config.resultsTemplate.indexOf('.eco') != -1) {
      // otherwise if a string was passed that is a path to a .eco file,
      // assume it is a path to an eco template
      var ecoCompiler = require('../node_modules/eco/lib/compiler');
      var templatePath = this.docpad.config.rootPath + '/' + this.config.resultsTemplate;
      var templateFile = fs.readFileSync(templatePath, { encoding: 'utf8' });
      var templateFunc = ecoCompiler.compile(templateFile);
      resultsTemplate = templateFunc.toString();
    }
    if (resultsTemplate) {
      // very poor-man's minify: just remove line breaks
      // todo: use an actual minify library or something
      resultsTemplate = resultsTemplate.replace(/(\r\n|\n|\r)/gm," ");
      fs.writeSync(file, 'lunrdoc.template = ' + resultsTemplate + ';');
    }
    // finished with that file
    fs.closeSync(file);

    // next copy the included faceted search example implementation
    var clientFiles = {
      'lunrdoc-client.css': __dirname + '/client/',
      'lunrdoc-client.js': __dirname + '/client/',
      'lunr.min.js': __dirname + '/../node_modules/lunr/'
    };
    var destDir = this.docpad.config.rootPath + '/' + this.config.clientFiles + '/';
    for (var fileName in clientFiles) {
      var destFile = fs.openSync(destDir + fileName, 'w+');
      var source = fs.readFileSync(clientFiles[fileName] + fileName, { encoding: 'utf8' });
      fs.writeSync(destFile, source);
      fs.closeSync(destFile);
    }
  }
}