import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import type { Listing } from "../types";

function HomePage() {
  const navigate = useNavigate();

  const {
    message,
    isLoggedIn,
    setMessage,
    isLoadingListings,
    filteredListings,
    hasActiveFilters,
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
          <div className="listing-card" key={listing.id || listing.title}>
            <h3>{listing.title}</h3>

            <p>{listing.description}</p>

            <p className="listing-meta">
              {listing.academicLevel} • {listing.subject}
            </p>

            <p className="listing-meta">Seller: {listing.seller}</p>

            <p className="price">
              {listing.price === 0 ? "Free" : `$${listing.price.toFixed(2)}`}
            </p>

            <div className="home-listing-actions">
              <button
                className="small-green-btn"
                onClick={() => handleViewListing(listing)}
              >
                View
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

export default HomePage;