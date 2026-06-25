import type { Listing, Page } from "../types";

type ListingPageProps = {
  selectedListing: Listing | null;
  setPage: React.Dispatch<React.SetStateAction<Page>>;
};

function ListingPage({ selectedListing, setPage }: ListingPageProps) {
  if (!selectedListing) {
    return (
      <main className="listing-detail-page">
        <p>No listing selected.</p>

        <button className="back-to-home-btn" onClick={() => setPage("home")}>
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

          <p className="listing-detail-meta">
            Seller: {selectedListing.seller}
          </p>

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

      <button className="back-to-home-btn" onClick={() => setPage("home")}>
        Back to Home
      </button>
    </main>
  );
}

export default ListingPage;