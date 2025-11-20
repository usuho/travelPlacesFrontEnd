// Central place to keep the list of countries that have normal attractions.
// This lets multiple components share the same catalog without duplicating arrays.

export const COUNTRY_CATALOG = [
  { slug: 'japan', iso2: 'jp' },
  { slug: 'china', iso2: 'cn' },
  { slug: 'singapore', iso2: 'sg' },
  { slug: 'malaysia', iso2: 'my' },
  { slug: 'thailand', iso2: 'th' },
  { slug: 'vietnam', iso2: 'vn' },
  { slug: 'switzerland', iso2: 'ch' },
  { slug: 'america', iso2: 'us' },
  { slug: 'canada', iso2: 'ca' },
  { slug: 'mexico', iso2: 'mx' },
  { slug: 'iceland', iso2: 'is' },
  { slug: 'denmark', iso2: 'dk' },
  { slug: 'australia', iso2: 'au' },
  { slug: 'newzealand', iso2: 'nz' },
];

const isoLookup = COUNTRY_CATALOG.reduce((acc, item) => {
  if (item.iso2 && item.slug) acc[item.iso2.toLowerCase()] = item.slug;
  return acc;
}, {});

const supportedSlugSet = new Set(COUNTRY_CATALOG.map(item => item.slug));

export function getSupportedCountrySlugs() {
  return COUNTRY_CATALOG.map(item => item.slug);
}

export function getCountrySlugByIso(iso2) {
  if (!iso2) return '';
  return isoLookup[iso2.toLowerCase()] || '';
}

export function isSupportedCountrySlug(slug) {
  if (!slug) return false;
  return supportedSlugSet.has(String(slug));
}
