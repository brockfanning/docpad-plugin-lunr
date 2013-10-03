var lunrdoc = lunrdoc || {};
lunrdoc.init = function(config) {
  config = config || {};
  // make sure our index is present
  if (typeof lunrdoc.indexJson === 'undefined') {
    console.log('The Lunr index is not available. Make sure that lunr_data.js is loaded before this script.');
    return;
  }
  // set defaults or use custom config
  var defaults = {
    inputContainer: 'body',
    resultsContainer: 'body',
    facetsContainer: 'body'
  }
  for (var prop in defaults) {
    if (typeof config[prop] === 'undefined') {
      config[prop] = defaults[prop];
    }
  }
  // do we have facets?
  lunrdoc.useFacets = false;
  if (typeof lunrdoc.facets !== 'undefined') {
    lunrdoc.useFacets = true;
    // also rearrange the facets array into something more useful
    var facetsTemp = {};
    for (var i in lunrdoc.facets) {
      facetsTemp[lunrdoc.facets[i].name] = {};
      if (typeof lunrdoc.facets[i].label !== 'undefined') {
        facetsTemp[lunrdoc.facets[i].name].label = lunrdoc.facets[i].label;
      }
    }
    lunrdoc.facets = facetsTemp;
    lunrdoc.activeFilters = {};
  }
  // load the index into memory
  lunrdoc.idx = lunr.Index.load(lunrdoc.indexJson);
  // create the elements
  lunrdoc.inputBox = document.createElement('input');
  lunrdoc.inputBox.id = 'lunr-input';
  lunrdoc.inputBox.placeholder = 'type words here';
  document.querySelector(config.inputContainer).appendChild(lunrdoc.inputBox);
  lunrdoc.resultsContainer = document.createElement('div');
  lunrdoc.resultsContainer.id = 'lunr-results';
  document.querySelector(config.resultsContainer).appendChild(lunrdoc.resultsContainer);
  if (lunrdoc.useFacets) {
    lunrdoc.facetsContainer = document.createElement('div');
    lunrdoc.facetsContainer.id = 'lunr-facets';
    document.querySelector(config.facetsContainer).appendChild(lunrdoc.facetsContainer);
  }
  // add the behavior
  lunrdoc.inputBox.onkeyup = lunrdoc.doSearch;
  lunrdoc.inputBox.focus();
};
lunrdoc.printFacets = function() {
  lunrdoc.facetsContainer.innerHTML = '';
  for (var facet in lunrdoc.currentFacets) {
    var facetGroup = document.createElement('div');
    var facetTitle = document.createElement('h3');
    var facetLabel = facet;
    if (typeof lunrdoc.facets[facet].label !== 'undefined') {
      facetLabel = lunrdoc.facets[facet].label;
    }
    var facetTitleValue = document.createTextNode(facetLabel);
    facetTitle.appendChild(facetTitleValue);
    var facetList = document.createElement('ul');
    for (var filter in lunrdoc.currentFacets[facet]) {
      var filterValue = document.createTextNode(filter + 
        ' (' + lunrdoc.currentFacets[facet][filter] + ')');
      var filterItem = document.createElement('li');
      filterItem.appendChild(filterValue);
      // make sure this is not an active filter
      if (typeof lunrdoc.activeFilters[facet] !== 'undefined' &&
          typeof lunrdoc.activeFilters[facet][filter] !== 'undefined') {
        filterItem.className = 'active';
      }
      filterItem.onclick = function(cfacet, cfilter) { 
        return function() {
          if (typeof lunrdoc.activeFilters[cfacet] !== 'undefined' &&
              typeof lunrdoc.activeFilters[cfacet][cfilter] !== 'undefined') {
            // the facet/filter is active, so remove it
            delete lunrdoc.activeFilters[cfacet][cfilter];
            this.className = '';
          } else {
            // the facet/filter is not active, so add it
            if (typeof lunrdoc.activeFilters[cfacet] === 'undefined') {
              lunrdoc.activeFilters[cfacet] = {};
            }
            if (typeof lunrdoc.activeFilters[cfacet][cfilter] === 'undefined') {
              lunrdoc.activeFilters[cfacet][cfilter] = {};
            }
            this.className = 'active';
          }
          lunrdoc.doSearch();
        };
      }(facet, filter);
      facetList.appendChild(filterItem);
    }
    facetGroup.appendChild(facetTitle);
    facetGroup.appendChild(facetList);
    lunrdoc.facetsContainer.appendChild(facetGroup);
  }
};
lunrdoc.doSearch = function() {
  var keywords = lunrdoc.inputBox.value;
  if (keywords) {
    lunrdoc.resultsContainer.innerHTML = '';
    lunrdoc.currentFacets = {};
    var results = lunrdoc.idx.search(keywords);
    for (var i in results) {
      var item = lunrdoc.content[results[i].ref];
      var displayItem = true;
      // check against all active filters if using facets
      if (lunrdoc.useFacets) {
        for (var facet in lunrdoc.activeFilters) {
          if (typeof item[facet] === 'undefined') {
            displayItem = false;
            break;
          } else if (Array.isArray(item[facet])) {
            for (var filter in lunrdoc.activeFilters[facet]) {
              if (item[facet].indexOf(filter) == -1) {
                displayItem = false;
                break;
              }
            }
          } else {
            for (var filter in lunrdoc.activeFilters[facet]) {
              if (item[facet] != filter) {
                displayItem = false;
                break;
              }
            }  
          }
        }
      }
      if (displayItem) {
        lunrdoc.resultsContainer.innerHTML += lunrdoc.template({post: item});
        // if using facets, display those
        if (lunrdoc.useFacets) {
          for (var facet in lunrdoc.facets) {
            if (typeof item[facet] === 'undefined') {
              continue;
            }
            if (typeof lunrdoc.currentFacets[facet] === 'undefined') {
              lunrdoc.currentFacets[facet] = {};
            }
            if (Array.isArray(item[facet])) {
              for (var j in item[facet]) {
                if (typeof lunrdoc.currentFacets[facet][item[facet][j]] === 'undefined') {
                  lunrdoc.currentFacets[facet][item[facet][j]] = 0;
                }
                lunrdoc.currentFacets[facet][item[facet][j]] += 1;
              }
            } else {
              if (typeof lunrdoc.currentFacets[facet][item[facet]] === 'undefined') {
                lunrdoc.currentFacets[facet][item[facet]] = 0;
              }
              lunrdoc.currentFacets[facet][item[facet]] += 1;
            }
          }
        }
      }
    }
    if (lunrdoc.useFacets) {
      lunrdoc.printFacets();
    }
  }
};