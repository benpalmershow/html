// Search functionality - standalone for use across pages
// SRP: Single responsibility - handle search/filter operations
// Modernized with accessible landmarks, debounced live filtering, and IME safety.

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    var searchModule = factory();
    root.SearchUtils = searchModule;
    // Expose helpers globally for backward compatibility
    root.setupLatestItemsSearch = searchModule.setupLatestItemsSearch;
    root.setupIndicatorSearch = searchModule.setupIndicatorSearch;
    root.setupFilterBarSearchToggle = searchModule.setupFilterBarSearchToggle;
    root.initSearch = searchModule.initSearch;
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var DEBOUNCE_MS = 150;

  function debounce(fn, wait) {
    var timeout;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        fn.apply(context, args);
      }, wait);
    };
  }

  function syncSearchQueryToURL(query) {
    if (typeof window === 'undefined' || !window.history || !window.location) return;
    try {
      var url = new URL(window.location.href);
      if (query) {
        url.searchParams.set('search', query);
      } else {
        url.searchParams.delete('search');
      }
      window.history.replaceState(null, '', url);
    } catch (e) {
      // Ignore URL sync errors in restricted environments
    }
  }

  function getSearchQueryFromURL() {
    if (typeof window === 'undefined' || !window.location) return '';
    try {
      var params = new URLSearchParams(window.location.search);
      return (params.get('search') || '').trim();
    } catch (e) {
      return '';
    }
  }

  /**
   * Search for one-pager.html updates grid
   * Filters list items across section cards and toggles section visibility
   */
  function setupLatestItemsSearch() {
    if (typeof document === 'undefined') return;

    var searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    var clearBtn = document.getElementById('clearSearchBtn');
    var liveRegion = document.getElementById('searchLiveRegion');
    var emptyState = document.getElementById('searchEmptyState');
    var updatesGrid = document.querySelector('.updates-grid');

    function announceResults(count, query) {
      if (!liveRegion) return;
      if (!query) {
        liveRegion.textContent = '';
      } else if (count === 0) {
        liveRegion.textContent = 'No updates found matching "' + query + '".';
      } else {
        liveRegion.textContent = 'Found ' + count + ' matching update' + (count === 1 ? '' : 's') + '.';
      }
    }

    function filterItems() {
      var rawQuery = searchInput.value || '';
      var query = rawQuery.trim().toLowerCase();
      var terms = query.split(/\s+/).filter(Boolean);

      // Toggle clear button
      if (clearBtn) {
        clearBtn.classList.toggle('is-visible', terms.length > 0);
        clearBtn.hidden = terms.length === 0;
      }

      syncSearchQueryToURL(query);

      var sectionCards = document.querySelectorAll('.updates-grid .section-card');
      var totalMatches = 0;

      if (terms.length === 0) {
        // Reset everything to visible
        sectionCards.forEach(function (card) {
          card.style.display = '';
          var items = card.querySelectorAll('li');
          items.forEach(function (item) {
            item.style.display = '';
          });
        });

        if (emptyState) {
          emptyState.style.display = 'none';
        }
        announceResults(0, '');
        return;
      }

      sectionCards.forEach(function (card) {
        var items = card.querySelectorAll('li');
        var cardMatches = 0;

        items.forEach(function (item) {
          var text = (item.textContent || '').toLowerCase();
          var matchesAll = terms.every(function (term) {
            return text.indexOf(term) !== -1;
          });

          if (matchesAll) {
            item.style.display = '';
            cardMatches++;
            totalMatches++;
          } else {
            item.style.display = 'none';
          }
        });

        // Hide section card if none of its items match
        card.style.display = cardMatches > 0 ? '' : 'none';
      });

      if (emptyState) {
        if (totalMatches === 0) {
          emptyState.textContent = 'No updates found matching "' + rawQuery.trim() + '".';
          emptyState.style.display = 'block';
        } else {
          emptyState.style.display = 'none';
        }
      }

      announceResults(totalMatches, query);
    }

    var debouncedFilter = debounce(filterItems, DEBOUNCE_MS);

    searchInput.addEventListener('input', debouncedFilter);

    searchInput.addEventListener('keydown', function (e) {
      if (e.isComposing) return;
      if (e.key === 'Escape') {
        searchInput.value = '';
        filterItems();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.focus();
        filterItems();
      });
    }

    // If items in the updates grid are injected asynchronously, re-run filter
    if (updatesGrid && typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(
        debounce(function () {
          if ((searchInput.value || '').trim()) {
            filterItems();
          }
        }, 100)
      );
      observer.observe(updatesGrid, { childList: true, subtree: true });
    }

    // Read initial search query from URL if present
    var initialQuery = getSearchQueryFromURL();
    if (initialQuery) {
      searchInput.value = initialQuery;
      // Slight delay to allow initial cards to render
      setTimeout(filterItems, 100);
    }
  }

  /**
   * Search for financials.html indicator dashboard
   * Filters .indicator cards and their parent .category blocks
   */
  function setupIndicatorSearch() {
    if (typeof document === 'undefined') return;

    var searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    var clearBtn = document.getElementById('clearSearchBtn');
    var emptyState = document.getElementById('searchEmptyState');

    function updateEmptyState(visibleCategoriesCount, query) {
      if (!emptyState) return;
      if (visibleCategoriesCount === 0 && query) {
        emptyState.textContent = 'No indicators found matching "' + query + '".';
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';
      }
    }

    function filterIndicators() {
      var rawQuery = searchInput.value || '';
      var query = rawQuery.trim().toLowerCase();
      var terms = query.split(/\s+/).filter(Boolean);

      if (clearBtn) {
        clearBtn.classList.toggle('is-visible', terms.length > 0);
        clearBtn.hidden = terms.length === 0;
      }

      syncSearchQueryToURL(query);

      var indicators = document.querySelectorAll('.indicator');
      var categories = document.querySelectorAll('.category');

      if (terms.length === 0) {
        indicators.forEach(function (el) { el.style.display = ''; });
        categories.forEach(function (cat) { cat.style.display = ''; });
        updateEmptyState(categories.length, '');
        return;
      }

      indicators.forEach(function (indicator) {
        var name = (indicator.getAttribute('data-indicator-name') || '').toLowerCase();
        var agency = (indicator.querySelector('.indicator-agency')?.textContent || '').toLowerCase();
        var text = (indicator.textContent || '').toLowerCase();

        var matchesAll = terms.every(function (term) {
          return name.indexOf(term) !== -1 || agency.indexOf(term) !== -1 || text.indexOf(term) !== -1;
        });

        indicator.style.display = matchesAll ? '' : 'none';
      });

      var visibleCategories = 0;
      categories.forEach(function (cat) {
        var visibleIndicators = cat.querySelectorAll('.indicator:not([style*="display: none"])');
        var isVisible = visibleIndicators.length > 0;
        cat.style.display = isVisible ? '' : 'none';
        if (isVisible) visibleCategories++;
      });

      updateEmptyState(visibleCategories, rawQuery.trim());
    }

    var debouncedFilter = debounce(filterIndicators, DEBOUNCE_MS);

    searchInput.addEventListener('input', debouncedFilter);

    searchInput.addEventListener('keydown', function (e) {
      if (e.isComposing) return;
      if (e.key === 'Escape') {
        searchInput.value = '';
        filterIndicators();
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        searchInput.focus();
        filterIndicators();
      });
    }

    var initialQuery = getSearchQueryFromURL();
    if (initialQuery) {
      searchInput.value = initialQuery;
      setTimeout(filterIndicators, 100);
    }
  }

  function setupFilterBarSearchToggle() {
    if (typeof document === 'undefined') return;

    var toggle = document.getElementById('searchToggle');
    if (!toggle) return;

    var filterBar = toggle.closest('.filter-bar');
    var searchInput = document.getElementById('indicatorSearch');
    if (!filterBar || !searchInput) return;

    toggle.addEventListener('click', function () {
      filterBar.classList.add('search-open');
      setTimeout(function () { searchInput.focus(); }, 80);
    });

    searchInput.addEventListener('blur', function () {
      if (!searchInput.value.trim()) {
        filterBar.classList.remove('search-open');
      }
    });
  }

  function initSearch() {
    if (typeof document === 'undefined') return;

    var hasIndicatorSearch = document.getElementById('indicatorSearch');
    if (hasIndicatorSearch) {
      var isFinancials = document.getElementById('indicator-categories') || document.querySelector('.indicators-grid');
      if (isFinancials) {
        setupIndicatorSearch();
      } else {
        setupLatestItemsSearch();
      }
    }
    setupFilterBarSearchToggle();
  }

  // Auto-initialize on load if document is present
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSearch);
    } else {
      initSearch();
    }
  }

  return {
    initSearch: initSearch,
    setupLatestItemsSearch: setupLatestItemsSearch,
    setupIndicatorSearch: setupIndicatorSearch,
    setupFilterBarSearchToggle: setupFilterBarSearchToggle
  };
});
