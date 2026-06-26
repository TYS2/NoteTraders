import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

function ListingPage() {
  const navigate = useNavigate();
  const { listingId } = useParams();

  const { getListingById, isLoadingListings } = useAppContext();

  const selectedListing = getListingById(listingId);

  if (isLoadingListings) {
    return (
      <main className="listing-detail-page">
        <p>Loading listing...</p>
      </main>
    );
  }

  if (!selectedListing) {
    return (
      <main className="listing-detail-page">
        <p>No listing selected or this listing no longer exists.</p>

        <button className="back-to-home-btn" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </main>
    );
  }

  return (
    <main className="listing-detail-page">
      <section className="listing-detail-card no-image-listing-card">
        <div className="listing-detail-info">
          <h2>{selectedListing.title}</h2>

          <p className="listing-detail-description">
            {selectedListing.description}
          </p>

          <p className="listing-detail-meta">
            {selectedListing.academicLevel} • {selectedListing.subject}
          </p>

          <p className="listing-detail-meta">Seller: {selectedListing.seller}</p>

          <p className="listing-detail-price">
            {selectedListing.price === 0
              ? "Free"
              : `$${selectedListing.price.toFixed(2)}`}
          </p>

          <div className="listing-detail-actions">
            <button className="small-green-btn">Buy</button>
            <button className="small-green-btn">Chat with seller</button>
          </div>
        </div>
      </section>

      <button className="back-to-home-btn" onClick={() => navigate("/")}>
        Back to Home
      </button>
    </main>
  );
}

export default ListingPage;