import type { Listing } from "../types";

type HomePageProps = {
  message: string;
  isLoadingListings: boolean;
  filteredListings: Listing[];
  handleViewListing: (listing: Listing) => void;
};

function HomePage({
  message,
  isLoadingListings,
  filteredListings,
  handleViewListing,
}: HomePageProps) {
  return (
    <main className="homepage">
      {message && <p className="status-message homepage-message">{message}</p>}

      <h2>Find the notes you need, at prices you’ll love!</h2>

      <section className="listing-section">
        {isLoadingListings && <p>Loading listings...</p>}

        {!isLoadingListings && filteredListings.length === 0 && (
          <div className="empty-state">
            <h3>No listings yet</h3>
            <p>Log in and create the first one!</p>
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