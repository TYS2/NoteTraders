import type { Listing } from "../types";

type ListingCardProps = {
  listing: Listing;
  favourited: boolean;
  onToggleFavourite: (listing: Listing) => void;
  onView: (listing: Listing) => void;
};

function ListingCard({
  listing,
  favourited,
  onToggleFavourite,
  onView,
}: ListingCardProps) {
  return (
    <article className="listing-card">
      <h3>{listing.title}</h3>

      <p>{listing.description}</p>

      <p className="listing-meta">
        {listing.academicLevel} • {listing.subject}
      </p>

      <p className="listing-meta">Seller: {listing.seller}</p>

      <p className="price">
        {listing.price === 0
          ? "Free"
          : `$${listing.price.toFixed(2)}`}
      </p>

      <div className="home-listing-actions">
        <button
          type="button"
          className={`favourite-btn ${
            favourited ? "favourited" : ""
          }`}
          aria-label={
            favourited
              ? "Remove from favourites"
              : "Add to favourites"
          }
          aria-pressed={favourited}
          onClick={() => onToggleFavourite(listing)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
          </svg>
        </button>

        <button
          type="button"
          className="small-green-btn"
          onClick={() => onView(listing)}
        >
          View
        </button>
      </div>
    </article>
  );
}

export default ListingCard;