import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import type { Listing } from "../types";
import ListingCard from "../components/ListingCard";

function HomePage() {
  const navigate = useNavigate();

  const {
    message,
    isLoggedIn,
    setMessage,
    isLoadingListings,
    filteredListings,
    hasActiveFilters,
    isFavourite,
    toggleFavourite,
  } = useAppContext();

  function handleViewListing(listing: Listing) {
    if (!listing.id) {
      setMessage("This listing is missing an ID, so it cannot be opened.");
      return;
    }

    if (!isLoggedIn) {
      setMessage("Please sign in first.");
      navigate("/login");
      return;
    }

    navigate(`/listings/${listing.id}`);
  }

  function handleToggleFavourite(listing: Listing) {
    if (!isLoggedIn) {
      setMessage("Please sign in first.");
      navigate("/login");
      return;
    }

    void toggleFavourite(listing);
  }

  return (
    <main className="homepage">
      {message && <p className="status-message homepage-message">{message}</p>}

      <h2>Find the notes you need, at prices you’ll love!</h2>

      <section className="listing-section">
        {isLoadingListings && <p>Loading listings...</p>}

        {!isLoadingListings && filteredListings.length === 0 && (
          <div className="empty-state">
            {hasActiveFilters ? (
              <>
                <h3>No available notes</h3>
                <p>Try changing your search or filter options.</p>
              </>
            ) : (
              <>
                <h3>No listings yet</h3>
                <p>Log in and create the first one!</p>
              </>
            )}
          </div>
        )}

        {filteredListings.map((listing) => (
          <ListingCard
            key={listing.id || listing.title}
            listing={listing}
            favourited={isFavourite(listing.id)}
            onToggleFavourite={handleToggleFavourite}
            onView={handleViewListing}
          />
        ))}
      </section>
    </main>
  );
}

export default HomePage;