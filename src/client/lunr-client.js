var lunrdoc = lunrdoc || {};
lunrdoc.init = function(config) {
  config = config || {};
  var errors = [];
  // make sure our index is present
  if (typeof lunrdoc.indexJson === 'undefined') {
    errors.push('Lunr: The index is not available. Make sure that lunr_data.js is loaded before this script.');
  }
  // set defaults or use custom config
  var defaults = {
    inputID: 'lunr-input',
    hiddenID: 'lunr-hidden',
    resultsID: 'lunr-results',
    facetsID: 'lunr-facets'
  }
  for (var prop in defaults) {
    if (typeof config[prop] === 'undefined') {
      config[prop] = defaults[prop];
    }
  }
  // make sure the required elements are there
  lunrdoc.inputBox = document.querySelector('#' + config.inputID);
  lunrdoc.hidden = document.querySelector('#' + config.hiddenID);
  lunrdoc.resultsContainer = document.querySelector('#' + config.resultsID);
  lunrdoc.facetsContainer = document.querySelector('#' + config.facetsID);
  
  if (!lunrdoc.inputBox) {
    errors.push('Lunr: An input element with the id ' + config.inputID + ' must exist on the page.');
  }

  // abort if errors
  if (errors.length > 0) {
    for (var i in errors) {
      console.log(errors[i]);
    }
    return;
  }

  if (!lunrdoc.resultsContainer) {
    lunrdoc.resultsContainer = document.createElement('div');
    lunrdoc.resultsContainer.id = config.resultsID;
    lunrdoc.inputBox.parentNode.appendChild(lunrdoc.resultsContainer);
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
    if (lunrdoc.hidden) {
      var previousFilters = lunrdoc.hidden.value;
      if (previousFilters) {
        lunrdoc.activeFilters = JSON.parse(previousFilters);
      }
    }
  }

  if (lunrdoc.useFacets && !lunrdoc.facetsContainer) {
    lunrdoc.facetsContainer = document.createElement('div');
    lunrdoc.facetsContainer.id = config.facetsID;
    lunrdoc.inputBox.parentNode.appendChild(lunrdoc.facetsContainer);
  }

  // load the index into memory
  lunrdoc.idx = lunr.Index.load(lunrdoc.indexJson);
  // add the behavior
  lunrdoc.inputBox.onkeyup = lunrdoc.doSearch;
  lunrdoc.inputBox.focus();
  // do a search now, for when users clicked 'Back' to get here
  lunrdoc.doSearch();
};
lunrdoc.printFacets = function() {
  // clear existing facets
  lunrdoc.facetsContainer.innerHTML = '';
  // make sure that active filters show up, even if they wouldn't be
  // in the search results
  for (var activeFacet in lunrdoc.activeFilters) {
    if (typeof lunrdoc.currentFacets[activeFacet] === 'undefined') {
      lunrdoc.currentFacets[activeFacet] = {};
    }
    for (var activeFilter in lunrdoc.activeFilters[activeFacet]) {
      if (typeof lunrdoc.currentFacets[activeFacet][activeFilter] === 'undefined') {
        lunrdoc.currentFacets[activeFacet][activeFilter] = 0;
      }
    }
  }
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
      lunrdoc.hidden.value = JSON.stringify(lunrdoc.activeFilters);
      lunrdoc.printFacets();
    }
  }
};

document.body.onLoad = lunrdoc.init();