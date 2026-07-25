import { useNavigate } from "react-router-dom";
import ListingCard from "../components/ListingCard";
import { useAppContext } from "../context/AppContext";
import type { Listing } from "../types";

function FavouritesPage() {
  const navigate = useNavigate();

  const {
    message,
    setMessage,
    favouriteListings,
    isLoadingFavourites,
    isFavourite,
    toggleFavourite,
  } = useAppContext();

  function handleViewListing(listing: Listing) {
    if (!listing.id) {
      setMessage(
        "This listing is missing an ID, so it cannot be opened."
      );
      return;
    }

    navigate(`/listings/${listing.id}`);
  }

  return (
    <main className="homepage favourites-page">
      {message && (
        <p className="status-message homepage-message">
          {message}
        </p>
      )}

      <h2>Favourites</h2>

      <section className="listing-section">
        {isLoadingFavourites && <p>Loading favourites...</p>}

        {!isLoadingFavourites &&
          favouriteListings.length === 0 && (
            <div className="empty-state">
              <h3>No favourites yet</h3>
              <p>
                Save a listing by clicking its heart button.
              </p>
            </div>
          )}

        {favouriteListings.map((listing) => (
          <ListingCard
            key={listing.id || listing.title}
            listing={listing}
            favourited={isFavourite(listing.id)}
            onToggleFavourite={(selectedListing) => {
              void toggleFavourite(selectedListing);
            }}
            onView={handleViewListing}
          />
        ))}
      </section>
    </main>
  );
}

export default FavouritesPage;