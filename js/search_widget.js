import { supabase } from './supabase.js';

/**
 * Unified Search Engine for Sunrise Bacalar
 * Calculates categories, destinations, price ranges, and tags automatically
 * from active, published properties in the database.
 */

// Round price to a neat, human-friendly value
function roundToNicePrice(price) {
    if (price <= 0) return 0;
    if (price < 100000) {
        return Math.round(price / 10000) * 10000;
    } else if (price < 1000000) {
        return Math.round(price / 50000) * 50000;
    } else if (price < 5000000) {
        return Math.round(price / 250000) * 250000;
    } else if (price < 20000000) {
        return Math.round(price / 1000000) * 1000000;
    } else {
        return Math.round(price / 5000000) * 5000000;
    }
}

// Format price with M/k suffixes for modern aesthetics
function formatPriceNice(price) {
    if (price >= 1000000) {
        const val = price / 1000000;
        // Keep 1 decimal place if it's not a whole number (e.g. 1.5M), otherwise format as integer (e.g. 12M)
        return `$${Number(val.toFixed(1)).toString()}M`;
    } else if (price >= 1000) {
        return `$${(price / 1000).toFixed(0)}k`;
    }
    return `$${price}`;
}

/**
 * Fetches active, published properties from Supabase
 */
export async function fetchActiveProperties() {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('*, destinations(id, name), property_categories(id, name)')
            .eq('is_published', true)
            .eq('status', 'active');
            
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching active properties for search widget:', err);
        return [];
    }
}

/**
 * Computes list of locations currently available in listed properties
 */
export function getUniqueDestinations(properties) {
    const destMap = new Map();
    properties.forEach(p => {
        if (p.destinations) {
            destMap.set(p.destinations.id, p.destinations.name);
        }
    });
    return Array.from(destMap.entries()).map(([id, name]) => ({ id, name }));
}

/**
 * Computes list of categories currently available in listed properties
 */
export function getUniqueCategories(properties) {
    const catMap = new Map();
    properties.forEach(p => {
        if (p.property_categories) {
            catMap.set(p.property_categories.id, p.property_categories.name);
        }
    });
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
}

/**
 * Computes list of purposes (listing types) currently available in listed properties
 */
export function getUniquePurposes(properties) {
    const purposes = new Set();
    properties.forEach(p => {
        if (p.listing_type) {
            purposes.add(p.listing_type);
        }
    });
    return Array.from(purposes).map(type => {
        let label = type;
        if (type === 'sale') label = 'Buy';
        else if (type === 'rent') label = 'Rent';
        else if (type === 'lease') label = 'Lease';
        return { value: type, label };
    });
}

/**
 * Computes 3 dynamic price brackets based on minimum and maximum prices of active listings
 */
export function getDynamicPriceRanges(properties) {
    const prices = properties
        .map(p => parseFloat(p.price))
        .filter(price => !isNaN(price) && price > 0);

    if (prices.length === 0) {
        // Fallback standard price ranges if no properties are found
        return [
            { value: '0-1000000', label: 'Under $1M' },
            { value: '1000000-3000000', label: '$1M - $3M' },
            { value: '3000000-999999999', label: '$3M+' }
        ];
    }

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (maxPrice <= minPrice || prices.length < 3) {
        // Safe ranges around the single price/small set
        const roundedPivot = roundToNicePrice(minPrice);
        return [
            { value: `0-${roundedPivot}`, label: `Under ${formatPriceNice(roundedPivot)}` },
            { value: `${roundedPivot}-999999999`, label: `${formatPriceNice(roundedPivot)}+` }
        ];
    }

    const step = (maxPrice - minPrice) / 3;
    const lowBound = roundToNicePrice(minPrice + step);
    const highBound = roundToNicePrice(minPrice + 2 * step);

    return [
        { value: `0-${lowBound}`, label: `Under ${formatPriceNice(lowBound)}` },
        { value: `${lowBound}-${highBound}`, label: `${formatPriceNice(lowBound)} - ${formatPriceNice(highBound)}` },
        { value: `${highBound}-999999999`, label: `${formatPriceNice(highBound)}+` }
    ];
}

/**
 * Computes active tags/flags from listings (Exclusive, Featured, New Listing, Subtypes)
 */
export function getUniqueTags(properties) {
    const tags = [];
    const hasFeatured = properties.some(p => p.is_featured);
    const hasExclusive = properties.some(p => p.is_exclusive);
    const hasNew = properties.some(p => p.is_new_listing);

    if (hasFeatured) tags.push({ value: 'is_featured', label: 'Featured Selection' });
    if (hasExclusive) tags.push({ value: 'is_exclusive', label: 'Exclusive Sanctuary' });
    if (hasNew) tags.push({ value: 'is_new_listing', label: 'New Listing' });

    // Grab unique property_subtypes if any exist in the listings
    const subtypes = new Set();
    properties.forEach(p => {
        if (p.property_subtype && p.property_subtype.trim()) {
            subtypes.add(p.property_subtype.trim());
        }
    });
    subtypes.forEach(sub => {
        tags.push({ value: `subtype:${sub}`, label: sub });
    });

    return tags;
}

/**
 * Helper to dynamically populate selector HTML elements
 */
function fillSelect(elementId, items, placeholder, valueField = 'id', labelField = 'name') {
    const select = document.getElementById(elementId);
    if (!select) return;

    select.innerHTML = `<option value="">${placeholder}</option>`;
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueField];
        option.textContent = item[labelField];
        select.appendChild(option);
    });
}

/**
 * Initialize and populate all selectors on the page automatically
 * @param {string} pageType - Type of page: 'home', 'portfolio', 'about', 'destination'
 * @param {string} currentDestinationId - For destination page, locks the search to this location
 */
export async function initSearchWidget(pageType = 'home', currentDestinationId = null) {
    const properties = await fetchActiveProperties();

    // Filter properties if we are on a destination-specific search
    let filteredProperties = properties;
    if (currentDestinationId) {
        filteredProperties = properties.filter(p => p.destination_id === currentDestinationId);
    }

    // Compute all dynamic option lists
    const destinations = getUniqueDestinations(properties); // Destinations are always global
    const categories = getUniqueCategories(filteredProperties);
    const priceRanges = getDynamicPriceRanges(filteredProperties);
    const purposes = getUniquePurposes(filteredProperties);
    const tags = getUniqueTags(filteredProperties);

    // Dynamic population based on element presence
    // 1. Locations
    const locId = pageType === 'portfolio' ? 'filter-location' : 'search-location';
    fillSelect(locId, destinations, pageType === 'portfolio' ? 'All Locations' : 'Select Location', 'id', 'name');
    
    // If destination page, lock and pre-select current destination
    if (pageType === 'destination' && currentDestinationId) {
        const locSelect = document.getElementById('search-location');
        if (locSelect) {
            locSelect.value = currentDestinationId;
            locSelect.disabled = true;
        }
    }

    // 2. Categories
    const catId = pageType === 'portfolio' ? 'filter-category' : 'search-category';
    fillSelect(catId, categories, pageType === 'portfolio' ? 'All Categories' : 'Select Category', 'id', 'name');

    // 3. Prices
    const priceId = pageType === 'portfolio' ? 'filter-price' : 'search-price';
    fillSelect(priceId, priceRanges, pageType === 'portfolio' ? 'Any Price' : 'Select Price', 'value', 'label');

    // 4. Purposes (Listing Type)
    const purpId = pageType === 'portfolio' ? 'filter-purpose' : 'search-purpose';
    fillSelect(purpId, purposes, pageType === 'portfolio' ? 'Any Purpose' : 'Select Purpose', 'value', 'label');

    // 5. Tags (Only for Portfolio page by default)
    if (pageType === 'portfolio') {
        fillSelect('filter-tag', tags, 'Any Tag/Feature', 'value', 'label');
    }
}

/**
 * Formulates the search URL and redirects to Portfolio
 */
export function executeSearch(pageType = 'home') {
    const prefix = pageType === 'portfolio' ? 'filter-' : 'search-';
    
    const location = document.getElementById(`${prefix}location`)?.value || '';
    const category = document.getElementById(`${prefix}category`)?.value || '';
    const price = document.getElementById(`${prefix}price`)?.value || '';
    const purpose = document.getElementById(`${prefix}purpose`)?.value || '';
    const tag = document.getElementById(`${prefix}tag`)?.value || '';

    const filters = {
        location,
        category,
        price,
        purpose,
        tag
    };

    if (pageType === 'portfolio') {
        // On Portfolio, this should trigger refreshing results instead of redirecting
        return filters;
    } else {
        // On other pages, redirect to Portfolio with URL query params
        redirectToPortfolio(filters);
    }
}

/**
 * Redirect to Portfolio.html with filters in the query string
 */
export function redirectToPortfolio(filters) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
        if (val) params.append(key, val);
    }
    window.location.href = `Portfolio.html?${params.toString()}`;
}

/**
 * Parses and applies URL parameters to the selectors on Portfolio page
 */
export function applyUrlFilters() {
    const params = new URLSearchParams(window.location.search);
    
    const mapping = {
        'location': 'filter-location',
        'category': 'filter-category',
        'price': 'filter-price',
        'purpose': 'filter-purpose',
        'tag': 'filter-tag'
    };

    let hasActiveFilters = false;

    for (const [paramKey, elementId] of Object.entries(mapping)) {
        const value = params.get(paramKey);
        if (value) {
            const selectEl = document.getElementById(elementId);
            if (selectEl) {
                selectEl.value = value;
                hasActiveFilters = true;
            }
        }
    }

    return hasActiveFilters;
}
