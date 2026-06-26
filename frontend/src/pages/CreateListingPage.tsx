import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ACADEMIC_LEVEL_OPTIONS, SUBJECT_OPTIONS } from "../constants";
import { useAppContext } from "../context/AppContext";

function CreateListingPage() {
  const navigate = useNavigate();

  const { message, listingForm, setListingForm, createListing } =
    useAppContext();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const success = await createListing();

    if (success) {
      navigate("/");
    }
  }

  return (
    <main className="simple-page">
      <form className="simple-card listing-form" onSubmit={handleSubmit}>
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
            setListingForm({ ...listingForm, academicLevel: event.target.value })
          }
          required
        >
          <option value="">Select academic level</option>

          {ACADEMIC_LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <label>Subject</label>
        <select
          value={listingForm.subject}
          onChange={(event) =>
            setListingForm({ ...listingForm, subject: event.target.value })
          }
          required
        >
          <option value="">Select subject</option>

          {SUBJECT_OPTIONS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>

        <button className="main-btn" type="submit">
          Post Listing
        </button>
      </form>
    </main>
  );
}

export default CreateListingPage;