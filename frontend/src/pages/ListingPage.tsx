import { useNavigate, useParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

function ListingPage() {
  const navigate = useNavigate();
  const { listingId } = useParams();

  const {
    message,
    getListingById,
    isLoadingListings,
    purchaseListing,
    currentUser,
    setMessage,
  } = useAppContext();

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

  async function handleBuy() {
    if (!selectedListing) return;

    const success = await purchaseListing(selectedListing);

    if (success) {
      navigate("/account");
    }
  }

  return (
    <main className="listing-detail-page">
      {message && <p className="status-message listing-detail-message">{message}</p>}
      
      <section className="listing-detail-card">
        <div className="listing-detail-content">
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
          </div>

          {selectedListing.photoUrl && (
            <div className="listing-detail-image-wrapper">
              <img
                className="listing-detail-image"
                src={selectedListing.photoUrl}
                alt={selectedListing.title}
              />
            </div>
          )}
        </div>

        <div className="listing-detail-actions">
          <button
            className="small-green-btn"
            onClick={handleBuy}
            disabled={currentUser?.username === selectedListing.seller}
          >
            Buy
          </button>

          <button
            className="small-green-btn"
            onClick={() => setMessage("Chat is not implemented yet.")}
          >
            Chat with seller
          </button>
        </div>
      </section>

      <button className="back-to-home-btn" onClick={() => navigate("/")}>
        Back to Home
      </button>
    </main>
  );
}

export default ListingPage;