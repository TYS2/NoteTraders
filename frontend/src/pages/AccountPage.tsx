import type { EditUserForm, Listing, ListingForm, Page, User } from "../types";

type AccountPageProps = {
  message: string;
  currentUser: User | null;
  isEditingParticulars: boolean;
  editUserForm: EditUserForm;
  setEditUserForm: React.Dispatch<React.SetStateAction<EditUserForm>>;
  startEditParticulars: () => void;
  cancelEditParticulars: () => void;
  handleUpdateUser: () => void;
  profilePicture: string | null;
  handleProfilePictureUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  myListings: Listing[];
  setPage: React.Dispatch<React.SetStateAction<Page>>;
  editingListingId: string | null;
  editListingForm: ListingForm;
  setEditListingForm: React.Dispatch<React.SetStateAction<ListingForm>>;
  startEditListing: (listing: Listing) => void;
  cancelEditListing: () => void;
  handleUpdateListing: (listingId: string) => void;
  handleDeleteListing: (listingId: string) => void;
  handleViewListing: (listing: Listing) => void;
};

function AccountPage({
  message,
  currentUser,
  isEditingParticulars,
  editUserForm,
  setEditUserForm,
  startEditParticulars,
  cancelEditParticulars,
  handleUpdateUser,
  profilePicture,
  handleProfilePictureUpload,
  myListings,
  setPage,
  editingListingId,
  editListingForm,
  setEditListingForm,
  startEditListing,
  cancelEditListing,
  handleUpdateListing,
  handleDeleteListing,
  handleViewListing,
}: AccountPageProps) {
  return (
    <main className="account-page">
      {message && <p className="status-message account-message">{message}</p>}

      <section className="account-left">
        <h2 className="section-title">My Account</h2>

        <div className="account-details-card">
          <div className="account-info">
            <p>Account ID: {currentUser?.accountId || "-"}</p>

            {isEditingParticulars ? (
              <div className="edit-particulars-form">
                <label>
                  Username:
                  <input
                    type="text"
                    value={editUserForm.username}
                    onChange={(event) =>
                      setEditUserForm({
                        ...editUserForm,
                        username: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Email:
                  <input
                    type="email"
                    value={editUserForm.email}
                    onChange={(event) =>
                      setEditUserForm({
                        ...editUserForm,
                        email: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Phone Number:
                  <input
                    type="text"
                    value={editUserForm.phoneNumber}
                    onChange={(event) =>
                      setEditUserForm({
                        ...editUserForm,
                        phoneNumber: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="edit-particulars-actions">
                  <button className="small-green-btn" onClick={handleUpdateUser}>
                    Save
                  </button>

                  <button
                    className="small-green-btn"
                    onClick={cancelEditParticulars}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>Username: {currentUser?.username || "-"}</p>
                <p>Email: {currentUser?.email || "-"}</p>
                <p>Phone Number: {currentUser?.phoneNumber || "-"}</p>

                <button
                  className="small-green-btn"
                  onClick={startEditParticulars}
                >
                  Edit Particulars
                </button>
              </>
            )}

            <p className="account-balance">Account Balance: -</p>

            <div className="account-actions">
              <button className="small-green-btn">Top Up</button>
              <button className="small-green-btn">Withdraw</button>
              <button className="small-green-btn">
                View Transaction History
              </button>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-picture">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile preview" />
              ) : (
                <span>👤</span>
              )}
            </div>

            <label className="upload-picture-btn">
              Upload Picture
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
              />
            </label>
          </div>
        </div>

        <section className="chat-section">
          <h2 className="section-title">My Chats</h2>
        </section>
      </section>

      <section className="account-right">
        <div className="listings-header">
          <h2 className="section-title">My listings</h2>

          <button
            className="small-green-btn"
            onClick={() => setPage("createListing")}
          >
            Add
          </button>
        </div>

        <div className="my-listings-list">
          {myListings.length === 0 && (
            <div className="empty-my-listings">
              <p>You have not posted any listings yet.</p>
            </div>
          )}

          {myListings.map((listing) => (
            <div className="my-listing-card" key={listing.id || listing.title}>
              {editingListingId === listing.id ? (
                <div className="edit-listing-form">
                  <input
                    type="text"
                    value={editListingForm.title}
                    onChange={(event) =>
                      setEditListingForm({
                        ...editListingForm,
                        title: event.target.value,
                      })
                    }
                  />

                  <textarea
                    value={editListingForm.description}
                    onChange={(event) =>
                      setEditListingForm({
                        ...editListingForm,
                        description: event.target.value,
                      })
                    }
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editListingForm.price}
                    onChange={(event) =>
                      setEditListingForm({
                        ...editListingForm,
                        price: event.target.value,
                      })
                    }
                  />

                  <select
                    value={editListingForm.academicLevel}
                    onChange={(event) =>
                      setEditListingForm({
                        ...editListingForm,
                        academicLevel: event.target.value,
                      })
                    }
                  >
                    <option value="">Choose level</option>
                    <option>Primary</option>
                    <option>Secondary</option>
                    <option>JC</option>
                    <option>University</option>
                  </select>

                  <select
                    value={editListingForm.subject}
                    onChange={(event) =>
                      setEditListingForm({
                        ...editListingForm,
                        subject: event.target.value,
                      })
                    }
                  >
                    <option value="">Choose subject</option>
                    <option>Math</option>
                    <option>Science</option>
                    <option>Computing</option>
                    <option>Chemistry</option>
                  </select>

                  <div className="listing-card-actions">
                    <button
                      className="small-green-btn"
                      onClick={() =>
                        listing.id && handleUpdateListing(listing.id)
                      }
                    >
                      Save
                    </button>

                    <button
                      className="small-green-btn"
                      onClick={cancelEditListing}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3>{listing.title}</h3>
                  <p>{listing.description}</p>

                  <p className="listing-small-text">
                    {listing.academicLevel} • {listing.subject}
                  </p>

                  <p className="listing-small-text">
                    {listing.price === 0
                      ? "Free"
                      : `$${listing.price.toFixed(2)}`}
                  </p>

                  <div className="listing-card-actions">
                    <button
                      className="small-green-btn"
                      onClick={() => startEditListing(listing)}
                    >
                      Edit
                    </button>

                    <button
                      className="small-green-btn"
                      onClick={() => handleViewListing(listing)}
                    >
                      View
                    </button>

                    <button
                      className="small-green-btn"
                      onClick={() =>
                        listing.id && handleDeleteListing(listing.id)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default AccountPage;