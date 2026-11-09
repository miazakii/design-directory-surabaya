const PRICES = {
  placeScraped: 0.004,
  filterApplied: 0.001,
  placeDetails: 0.002,
  contactDetails: 0.002,
  review: 0.0005,
};

// Perkiraan kasar: ~30% place punya website yang memicu contact-details.
const WEBSITE_SHARE = 0.3;

export function estimateRunCost({
  keywords,
  maxPlacesPerSearch,
  maxReviewsPerPlace = 0,
  contactsEnrichment = true,
}) {
  const places = Math.max(0, Number(keywords)) * Math.max(0, Number(maxPlacesPerSearch));
  const base = places * (PRICES.placeScraped + PRICES.filterApplied);
  const details = maxReviewsPerPlace > 0 ? places * PRICES.placeDetails : 0;
  const contacts = contactsEnrichment ? places * WEBSITE_SHARE * PRICES.contactDetails : 0;
  const reviews = places * Math.max(0, maxReviewsPerPlace) * PRICES.review;
  const total = base + details + contacts + reviews;

  return {
    places,
    base,
    details,
    contacts,
    reviews,
    total,
    perPlace: places > 0 ? total / places : 0,
  };
}
