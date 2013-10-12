var lunrdoc = lunrdoc || {};
lunrdoc.init = function(config) {
  config = config || {};
  var errors = [];
  // the index itself is an absolute requirement
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
  
  // the input box is absolute requirement
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
    // initialize an empty container for active filters
    lunrdoc.activeFilters = {};
    // if the page has a properly ID'd "hidden" input, we will use that
    // to store the active filters on, so that when users click "Back" after
    // going to a search result, their active filters will still be there.
    if (lunrdoc.hidden) {
      var previousFilters = lunrdoc.hidden.value;
      // if there is a value there, it means that the user just clicked "back".
      // so we need to set the active filters with this data
      if (previousFilters) {
        lunrdoc.activeFilters = JSON.parse(previousFilters);
      }
    }
  }

  // if the facets container is not on the page (and is needed) then
  // create it now.
  if (lunrdoc.useFacets && !lunrdoc.facetsContainer) {
    lunrdoc.facetsContainer = document.createElement('div');
    lunrdoc.facetsContainer.id = config.facetsID;
    lunrdoc.inputBox.parentNode.appendChild(lunrdoc.facetsContainer);
  }

  // if the results container is not present, create it now
   if (!lunrdoc.resultsContainer) {
    lunrdoc.resultsContainer = document.createElement('div');
    lunrdoc.resultsContainer.id = config.resultsID;
    lunrdoc.inputBox.parentNode.appendChild(lunrdoc.resultsContainer);
  }

  // check for keywords passed in through the URL, but only if the 
  // input box has no text already input in it (ie, if the user clicked back)
  if (!lunrdoc.inputBox.value) {
    var getParameterByName = function(name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }
    var urlQuery = getParameterByName('keys');
    if (urlQuery) {
      lunrdoc.inputBox.value = urlQuery;
    }
  }

  // load the index into memory
  lunrdoc.idx = lunr.Index.load(lunrdoc.indexJson);
  // add the behavior
  lunrdoc.inputBox.onkeyup = lunrdoc.doSearch;
  lunrdoc.inputBox.focus();
  // do a search now, for when users clicked 'Back' to get here
  lunrdoc.doSearch();
};

lunrdoc.toggleFilter = function(facet, filter, item) {
  if (typeof lunrdoc.activeFilters[facet] !== 'undefined' && typeof lunrdoc.activeFilters[facet][filter] !== 'undefined') {
    // the facet is active, so remove it
    delete lunrdoc.activeFilters[facet][filter];
    // we have to go to some trouble to check for when the facet is empty,
    // because if we leave an empty facet here, it causes problems
    var facetStillHasFilters = false;
    for (var prop in lunrdoc.activeFilters[facet]) {
      facetStillHasFilters = true;
      break;
    }
    if (!facetStillHasFilters) {
      delete lunrdoc.activeFilters[facet];
    }
    // not really necessary, but change the class for UI-responsiveness
    item.className = '';
  } else {
    // the facet/filter is not active, so add it
    if (typeof lunrdoc.activeFilters[facet] === 'undefined') {
      lunrdoc.activeFilters[facet] = {};
    }
    if (typeof lunrdoc.activeFilters[facet][filter] === 'undefined') {
      lunrdoc.activeFilters[facet][filter] = {};
    }
    // not really necessary, but change the class for UI-responsiveness
    item.className = 'active';
  }
};

lunrdoc.printFacets = function() {
  // clear existing facets
  lunrdoc.facetsContainer.innerHTML = '';
  // make sure that active filters show up, even if they wouldn't be
  // in the search results. this is needed because users can keep typing
  // keywords after they have already selected filters. so we'll need to
  // display, for example, "myfilter (0)" purely so that the user has a
  // way to disable that filter.
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
    // each facet will have its own div with an H3 label
    var facetGroup = document.createElement('div');
    var facetTitle = document.createElement('h3');
    var facetLabel = facet;
    if (typeof lunrdoc.facets[facet].label !== 'undefined') {
      facetLabel = lunrdoc.facets[facet].label;
    }
    var facetTitleValue = document.createTextNode(facetLabel);
    facetTitle.appendChild(facetTitleValue);
    // the filters of each facet will be inside an unordered list
    var facetList = document.createElement('ul');
    // take advantage of the Lunr library's cool SortedSet class to keep a sorted
    // list of the facet's filters
    var sortedFilters = new lunr.SortedSet;
    // meanwhile store the actual DOM elements in a keyed object to grab them later
    var unsortedFilters = {};
    for (var filter in lunrdoc.currentFacets[facet]) {
      var filterValue = document.createTextNode(filter + 
        ' (' + lunrdoc.currentFacets[facet][filter] + ')');
      var filterItem = document.createElement('li');
      filterItem.appendChild(filterValue);
      // see if this should be an active filter
      if (typeof lunrdoc.activeFilters[facet] !== 'undefined' &&
          typeof lunrdoc.activeFilters[facet][filter] !== 'undefined') {
        filterItem.className = 'active';
      }
      // add the click behavior, all closure-ified
      filterItem.onclick = function(cfacet, cfilter) { 
        return function() {
          lunrdoc.toggleFilter(cfacet, cfilter, this);
          lunrdoc.doSearch();
        };
      }(facet, filter);
      // now add the filter to our objects for sorting purposes
      unsortedFilters[filter] = filterItem;
      sortedFilters.add(filter);
    }
    // populate the list now
    var sortedFiltersArr = sortedFilters.toArray();
    for (var i in sortedFiltersArr) {
      facetList.appendChild(unsortedFilters[sortedFiltersArr[i]]);
    }
    facetGroup.appendChild(facetTitle);
    facetGroup.appendChild(facetList);
    lunrdoc.facetsContainer.appendChild(facetGroup);
  }
};

lunrdoc.doSearch = function() {
  // get the user's input
  var keywords = lunrdoc.inputBox.value;
  if (keywords) {
    // clear existing stuff
    lunrdoc.resultsContainer.innerHTML = '';
    lunrdoc.currentFacets = {};
    // do the search!
    var results = lunrdoc.idx.search(keywords);
    // if no results, show the "sorry" message
    if (results.length == 0) {
      lunrdoc.resultsContainer.innerHTML = lunrdoc.noResultsMessage;
    } else {
      // otherwise, cycle through the results
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
          // use our template function to render the markup for the item,
          // by passing it inside an object with a "post" attribute
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
    }
    if (lunrdoc.useFacets) {
      // set the active filters on our hidden input, to track that state
      // in case the user goes to a search results and clicks "back".
      lunrdoc.hidden.value = JSON.stringify(lunrdoc.activeFilters);
      lunrdoc.printFacets();
    }
  }
};

// run the init function! (this needs to also run when user clicks "back")
lunrdoc.ready = function(event) {
  lunrdoc.init();
  window.removeEventListener('DOMContentLoaded', lunrdoc.ready);
}
window.addEventListener('DOMContentLoaded', lunrdoc.ready);