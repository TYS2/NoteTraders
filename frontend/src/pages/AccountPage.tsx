import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ACADEMIC_LEVEL_OPTIONS, SUBJECT_OPTIONS } from "../constants";
import { useAppContext } from "../context/AppContext";

function AccountPage() {
  const navigate = useNavigate();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const {
    message,
    currentUser,
    isEditingParticulars,
    editUserForm,
    setEditUserForm,
    startEditParticulars,
    cancelEditParticulars,
    updateUser,
    profilePicture,
    handleProfilePictureUpload,
    myListings,
    editingListingId,
    editListingForm,
    setEditListingForm,
    startEditListing,
    cancelEditListing,
    updateListing,
    deleteListing,
    setMessage,
    topUpBalance,
    withdrawBalance,
  } = useAppContext();

  async function handleTopUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const success = await topUpBalance(Number(topUpAmount));
    if (success) setTopUpAmount("");
  }

  async function handleWithdraw(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const success = await withdrawBalance(Number(withdrawAmount));
    if (success) setWithdrawAmount("");
  }

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
                  <button className="small-green-btn" onClick={updateUser}>
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

            <p className="account-balance">
              Account Balance: ${Number(currentUser?.balance ?? 0).toFixed(2)}
            </p>

            <div className="account-actions">
              <form className="transaction-form" onSubmit={handleTopUp}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount"
                  value={topUpAmount}
                  onChange={(event) => setTopUpAmount(event.target.value)}
                />

                <button className="small-green-btn" type="submit">
                  Top Up
                </button>
              </form>

              <form className="transaction-form" onSubmit={handleWithdraw}>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount"
                  value={withdrawAmount}
                  onChange={(event) => setWithdrawAmount(event.target.value)}
                />

                <button className="small-green-btn" type="submit">
                  Withdraw
                </button>
              </form>

              <button
                className="small-green-btn"
                onClick={() =>
                  setMessage("Transaction history is not implemented yet.")
                }
              >
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

          <button className="small-green-btn" onClick={() => navigate("/sell")}>
            Add
          </button>
        </div>

        <div className="my-listings-list">
          {myListings.length === 0 && (
            <div className="empty-my-listings">
              <p>You have not posted any listings yet.</p>
            </div>
          )}

          {myListings.map((listing) => {
            const listingKey = String(listing.id || listing.title);
            const isEditingThisListing = editingListingId === String(listing.id);

            return (
              <div className="my-listing-card" key={listingKey}>
                {isEditingThisListing ? (
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

                      {ACADEMIC_LEVEL_OPTIONS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
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

                      {SUBJECT_OPTIONS.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>

                    {listing.photoUrl && (
                      <div className="edit-listing-current-image">
                        <p>Current photo:</p>
                        <img src={listing.photoUrl} alt={listing.title} />
                      </div>
                    )}

                    <label>Change Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        setEditListingForm({
                          ...editListingForm,
                          photoFile: event.target.files?.[0] ?? null,
                        })
                      }
                    />

                    {editListingForm.photoFile && (
                      <p className="file-helper">Selected: {editListingForm.photoFile.name}</p>
                    )}

                    <div className="listing-card-actions">
                      <button
                        className="small-green-btn"
                        onClick={() => listing.id && updateListing(listing.id)}
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
                        onClick={() =>
                          listing.id && navigate(`/listings/${listing.id}`)
                        }
                      >
                        View
                      </button>

                      {confirmDeleteId === String(listing.id) ? (
                        <div className="delete-confirm-actions">
                          <button
                            className="confirm-delete-btn"
                            onClick={() => {
                              if (!listing.id) return;

                              deleteListing(listing.id);
                              setConfirmDeleteId(null);
                            }}
                          >
                            Confirm
                          </button>

                          <button
                            className="cancel-delete-btn"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="small-green-btn"
                          onClick={() => {
                            if (!listing.id) return;

                            setConfirmDeleteId(String(listing.id));
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default AccountPage;