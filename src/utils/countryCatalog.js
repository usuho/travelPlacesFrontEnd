// Central place to keep the list of countries that have normal attractions.
// This lets multiple components share the same catalog without duplicating arrays.

export const COUNTRY_CATALOG = [
  { slug: 'japan', iso2: 'jp' },
  { slug: 'china', iso2: 'cn' },
  { slug: 'singapore', iso2: 'sg' },
  { slug: 'malaysia', iso2: 'my' },
  { slug: 'brunei', iso2: 'bn' },
  { slug: 'thailand', iso2: 'th' },
  { slug: 'vietnam', iso2: 'vn' },
  { slug: 'switzerland', iso2: 'ch' },
  { slug: 'andorra', iso2: 'ad' },
  { slug: 'liechtenstein', iso2: 'li' },
  { slug: 'malta', iso2: 'mt' },
  { slug: 'monaco', iso2: 'mc' },
  { slug: 'poland', iso2: 'pl' },
  { slug: 'sanmarino', iso2: 'sm' },
  { slug: 'slovenia', iso2: 'si' },
   // 欧洲
  { slug: 'france', iso2: 'fr' },
  { slug: 'germany', iso2: 'de' },
  { slug: 'uk', iso2: 'gb' },
  { slug: 'spain', iso2: 'es' },
  { slug: 'italy', iso2: 'it' },
  { slug: 'portugal', iso2: 'pt' },
  { slug: 'netherlands', iso2: 'nl' },
  { slug: 'sweden', iso2: 'se' },
  { slug: 'norway', iso2: 'no' },
  { slug: 'austria', iso2: 'at' },
  { slug: 'belgium', iso2: 'be' },
  { slug: 'finland', iso2: 'fi' },
  { slug: 'luxembourg', iso2: 'lu' },
  { slug: 'hungary', iso2: 'hu' },
  { slug: 'czech', iso2: 'cz' },
  { slug: 'slovakia', iso2: 'sk' },
  { slug: 'greece', iso2: 'gr' },
  { slug: 'croatia', iso2: 'hr' },
  { slug: 'lithuania', iso2: 'lt' },
  { slug: 'latvia', iso2: 'lv' },
  { slug: 'estonia', iso2: 'ee' },
  { slug: 'ukraine', iso2: 'ua' },
  { slug: 'georgia', iso2: 'ge' },
  { slug: 'armenia', iso2: 'am' },
  { slug: 'azerbaijan', iso2: 'az' },
  { slug: 'serbia', iso2: 'rs' },
  { slug: 'bulgaria', iso2: 'bg' },
  { slug: 'romania', iso2: 'ro' },
  { slug: 'moldova', iso2: 'md' },
  { slug: 'northmacedonia', iso2: 'mk' },
  { slug: 'albania', iso2: 'al' },
  { slug: 'montenegro', iso2: 'me' },
  { slug: 'bosniaherzegovina', iso2: 'ba' },
  { slug: 'kosovo', iso2: 'xk' },
  // 亚洲
  { slug: 'korea', iso2: 'kr' },
  { slug: 'indonesia', iso2: 'id' },
  { slug: 'srilanka', iso2: 'lk' },
  { slug: 'maldives', iso2: 'mv' },
  { slug: 'israel', iso2: 'il' },
  { slug: 'turkey', iso2: 'tr' },
  { slug: 'saudiarabia', iso2: 'sa' },
  { slug: 'uae', iso2: 'ae' },
  { slug: 'qatar', iso2: 'qa' },
  { slug: 'philippines', iso2: 'ph' },
  { slug: 'india', iso2: 'in' },
  { slug: 'bhutan', iso2: 'bt' },
  { slug: 'nepal', iso2: 'np' },
  // 南北美
  { slug: 'argentina', iso2: 'ar' },
  { slug: 'uruguay', iso2: 'uy' },
  { slug: 'brazil', iso2: 'br' },
  { slug: 'paraguay', iso2: 'py' },
  { slug: 'peru', iso2: 'pe' },
  { slug: 'chile', iso2: 'cl' },
  { slug: 'bolivia', iso2: 'bo' },
  { slug: 'guatemala', iso2: 'gt' },
  { slug: 'elsalvador', iso2: 'sv' },
  { slug: 'honduras', iso2: 'hn' },
  { slug: 'nicaragua', iso2: 'ni' },
  { slug: 'costarica', iso2: 'cr' },
  { slug: 'panama', iso2: 'pa' },
  // 非洲
  { slug: 'morocco', iso2: 'ma' },
  { slug: 'egypt', iso2: 'eg' },
  { slug: 'southafrica', iso2: 'za' },
  { slug: 'madagascar', iso2: 'mg' },
  { slug: 'america', iso2: 'us' },
  { slug: 'canada', iso2: 'ca' },
  { slug: 'mexico', iso2: 'mx' },
  { slug: 'iceland', iso2: 'is' },
  { slug: 'denmark', iso2: 'dk' },
  { slug: 'australia', iso2: 'au' },
  { slug: 'newzealand', iso2: 'nz' },
  { slug: 'papuanewguinea', iso2: 'pg' },
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
