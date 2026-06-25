import type { FormEvent } from "react";
import type { ListingForm } from "../types";

type CreateListingPageProps = {
  message: string;
  listingForm: ListingForm;
  setListingForm: React.Dispatch<React.SetStateAction<ListingForm>>;
  handleCreateListing: (event: FormEvent) => void;
};

function CreateListingPage({
  message,
  listingForm,
  setListingForm,
  handleCreateListing,
}: CreateListingPageProps) {
  return (
    <main className="simple-page">
      <form className="simple-card listing-form" onSubmit={handleCreateListing}>
        <h2>Create a Listing</h2>

        {message && <p className="status-message">{message}</p>}

        <label>Title</label>
        <input
          type="text"
          value={listingForm.title}
          onChange={(event) =>
            setListingForm({ ...listingForm, title: event.target.value })
          }
          required
        />

        <label>Description</label>
        <textarea
          value={listingForm.description}
          onChange={(event) =>
            setListingForm({ ...listingForm, description: event.target.value })
          }
          required
        />

        <label>Price</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={listingForm.price}
          onChange={(event) =>
            setListingForm({ ...listingForm, price: event.target.value })
          }
          required
        />

        <label>Academic Level</label>
        <select
          value={listingForm.academicLevel}
          onChange={(event) =>
            setListingForm({
              ...listingForm,
              academicLevel: event.target.value,
            })
          }
          required
        >
          <option value="">Choose one</option>
          <option>Primary</option>
          <option>Secondary</option>
          <option>JC</option>
          <option>University</option>
        </select>

        <label>Subject</label>
        <select
          value={listingForm.subject}
          onChange={(event) =>
            setListingForm({ ...listingForm, subject: event.target.value })
          }
          required
        >
          <option value="">Choose one</option>
          <option>Math</option>
          <option>Science</option>
          <option>Computing</option>
          <option>Chemistry</option>
        </select>

        <button className="main-btn" type="submit">
          Post Listing
        </button>
      </form>
    </main>
  );
}

export default CreateListingPage;