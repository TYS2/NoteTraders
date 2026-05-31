import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import logo from "./assets/logo.png";

type Page = "home" | "login" | "account" | "createListing" | "listing";

type User = {
  id?: string;
  accountId?: number;
  username: string;
  email: string;
  phoneNumber?: string;
};

type Listing = {
  id?: string;
  title: string;
  description: string;
  price: number;
  seller: string;
  academicLevel: string;
  subject: string;
};

const emptyListingForm = {
  title: "",
  description: "",
  price: "",
  academicLevel: "",
  subject: "",
};

function App() {
  const [page, setPage] = useState<Page>("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const [signupForm, setSignupForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phoneNumber: "",
  });

  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [listingForm, setListingForm] = useState(emptyListingForm);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [academicLevelFilter, setAcademicLevelFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editListingForm, setEditListingForm] = useState(emptyListingForm);

  const [isEditingParticulars, setIsEditingParticulars] = useState(false);

  const [editUserForm, setEditUserForm] = useState({
    username: "",
    email: "",
    phoneNumber: "",
  });

  async function fetchListings() {
    setIsLoadingListings(true);

    try {
      const response = await fetch("/listings");
      const text = await response.text();

      if (!text) {
        throw new Error(
          "No response from backend. Check if your backend is running on localhost:8080."
        );
      }

      const data = JSON.parse(text);

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch listings");
      }

      setListings(data.listings || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to fetch listings");
    } finally {
      setIsLoadingListings(false);
    }
  }

  useEffect(() => {
    fetchListings();
  }, []);

  function goToProtectedPage(targetPage: Page) {
    setMessage("");

    if (!isLoggedIn) {
      setPage("login");
    } else {
      setPage(targetPage);
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setPage("home");
    setMessage("Logged out successfully.");
  }

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();

    if (
      !signupForm.username.trim() ||
      !signupForm.password.trim() ||
      !signupForm.confirmPassword.trim() ||
      !signupForm.email.trim() ||
      !signupForm.phoneNumber.trim()
    ) {
      setMessage("Please fill in all fields");
      return;
    }

    if (!isValidPassword(signupForm.password)) {
      setMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      const response = await fetch("/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: signupForm.username,
          password: signupForm.password,
          email: signupForm.email,
          phoneNumber: signupForm.phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      setMessage("Signup successful! You can now log in.");

      setLoginForm({
        username: signupForm.username,
        password: "",
      });

      setSignupForm({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        phoneNumber: "",
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signup failed");
    }
  }

  function isValidPassword(password: string) {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    return (
      hasMinLength &&
      hasUppercase &&
      hasLowercase &&
      hasNumber &&
      hasSpecialChar
    );
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: loginForm.username,
          password: loginForm.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      setCurrentUser(data.user);
      setIsLoggedIn(true);
      setPage("home");
      setMessage(`Welcome back, ${data.user.username}!`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    }
  }

  async function handleCreateListing(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!currentUser) {
      setPage("login");
      return;
    }

    try {
      const response = await fetch("/createListing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: listingForm.title,
          description: listingForm.description,
          price: Number(listingForm.price),
          seller: currentUser.username,
          academicLevel: listingForm.academicLevel,
          subject: listingForm.subject,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create listing");
      }

      setMessage("Listing created successfully!");
      setListingForm(emptyListingForm);
      await fetchListings();
      setPage("home");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create listing");
    }
  }

  function startEditParticulars() {
    if (!currentUser) return;

    setEditUserForm({
      username: currentUser.username,
      email: currentUser.email,
      phoneNumber: currentUser.phoneNumber || "",
    });

    setIsEditingParticulars(true);
  }

  function cancelEditParticulars() {
    setIsEditingParticulars(false);

    setEditUserForm({
      username: "",
      email: "",
      phoneNumber: "",
    });
  }

  async function handleUpdateUser() {
    setMessage("");

    if (!currentUser?.accountId) {
      setMessage("Unable to update user because account ID is missing.");
      return;
    }

    try {
      const response = await fetch("/updateUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId: currentUser.accountId,
          username: editUserForm.username,
          email: editUserForm.email,
          phoneNumber: editUserForm.phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          `Failed to update particulars: ${data.error || "Unknown error"}`
        );
      }

      setCurrentUser(data.user);
      setIsEditingParticulars(false);
      setMessage("Particulars updated successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update particulars"
      );
    }
  }

  function handleViewListing(listing: Listing) {
    setSelectedListing(listing);
    goToProtectedPage("listing");
  }

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesSearch =
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.subject.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAcademicLevel =
        !academicLevelFilter || listing.academicLevel === academicLevelFilter;

      const matchesSubject =
        !subjectFilter || listing.subject === subjectFilter;

      const matchesPrice =
        !priceFilter ||
        (priceFilter === "Free" && listing.price === 0) ||
        (priceFilter === "Below $5" && listing.price > 0 && listing.price < 5) ||
        (priceFilter === "$5 - $10" && listing.price >= 5 && listing.price <= 10) ||
        (priceFilter === "Above $10" && listing.price > 10);

      return matchesSearch && matchesAcademicLevel && matchesSubject && matchesPrice;
    });
  }, [listings, searchTerm, academicLevelFilter, subjectFilter, priceFilter]);

  const myListings = useMemo(() => {
    if (!currentUser) return [];

    return listings.filter(
      (listing) => listing.seller === currentUser.username
    );
  }, [listings, currentUser]);

  function renderHeader() {
    return (
      <header className="top-header">
        <div className="logo-section" onClick={() => setPage("home")}>
          <img src={logo} alt="NoteTraders Logo" className="logo" />
          <h1>NoteTrade</h1>
        </div>
      </header>
    );
  }

  function renderNavbar() {
    return (
      <nav className="navbar">
        <div className="nav-left">
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => goToProtectedPage("account")}>Account</button>
          <button onClick={() => goToProtectedPage("createListing")}>Sell Notes</button>

          {isLoggedIn ? (
            <button onClick={handleLogout}>Log Out</button>
          ) : (
            <button onClick={() => setPage("login")}>Log In</button>
          )}
        </div>

        <div className="nav-right">
          <select
            value={academicLevelFilter}
            onChange={(event) => setAcademicLevelFilter(event.target.value)}
          >
            <option value="">Academic Level</option>
            <option>Primary</option>
            <option>Secondary</option>
            <option>JC</option>
            <option>University</option>
          </select>

          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
          >
            <option value="">Subject</option>
            <option>Math</option>
            <option>Science</option>
            <option>Computing</option>
            <option>Chemistry</option>
          </select>

          <select
            value={priceFilter}
            onChange={(event) => setPriceFilter(event.target.value)}
          >
            <option value="">Price</option>
            <option>Free</option>
            <option>Below $5</option>
            <option>$5 - $10</option>
            <option>Above $10</option>
          </select>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="button">⌕</button>
          </div>
        </div>
      </nav>
    );
  }

  function handleProfilePictureUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setProfilePicture(imageUrl);
  }

  function startEditListing(listing: Listing) {
    setEditingListingId(listing.id || null);

    setEditListingForm({
      title: listing.title,
      description: listing.description,
      price: String(listing.price),
      academicLevel: listing.academicLevel,
      subject: listing.subject,
    });
  }

  function cancelEditListing() {
    setEditingListingId(null);
    setEditListingForm(emptyListingForm);
  }

  async function handleUpdateListing(listingId: string) {
    if (!currentUser) return;

    try {
      const response = await fetch("/updateListing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: listingId,
          title: editListingForm.title,
          description: editListingForm.description,
          price: Number(editListingForm.price),
          seller: currentUser.username,
          academicLevel: editListingForm.academicLevel,
          subject: editListingForm.subject,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update listing");
      }

      setMessage("Listing updated successfully!");
      setEditingListingId(null);
      setEditListingForm(emptyListingForm);
      await fetchListings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update listing");
    }
  }

  async function handleDeleteListing(listingId: string) {
    const confirmDelete = window.confirm("Are you sure you want to delete this listing?");

    if (!confirmDelete) return;

    try {
      const response = await fetch("/deleteListing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: listingId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete listing");
      }

      setMessage("Listing deleted successfully!");
      await fetchListings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete listing");
    }
  }

  if (page === "login") {
    return (
      <div className="app">
        {renderHeader()}

        <main className="login-page">
          <div className="login-card">
            <h3 className="signup-heading">
              New to NoteTrade? Sign up to discover more notes.
            </h3>

            {message && <p className="status-message">{message}</p>}

            <form onSubmit={handleSignup}>
              <div className="form-row">
                <label>Username:</label>
                <input
                  type="text"
                  value={signupForm.username}
                  onChange={(event) =>
                    setSignupForm({ ...signupForm, username: event.target.value })
                  }
                  required
                />
              </div>

              <div className="form-row password-row">
                <label>Password:</label>

                <div className="password-input-group">
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(event) =>
                      setSignupForm({ ...signupForm, password: event.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <label>Confirm Password:</label>
                <input
                  type="password"
                  value={signupForm.confirmPassword}
                  onChange={(event) =>
                    setSignupForm({
                      ...signupForm,
                      confirmPassword: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-row">
                <label>Email:</label>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(event) =>
                    setSignupForm({ ...signupForm, email: event.target.value })
                  }
                  required
                />
              </div>

              <div className="form-row">
                <label>Phone:</label>
                <input
                  type="text"
                  value={signupForm.phoneNumber}
                  onChange={(event) =>
                    setSignupForm({ ...signupForm, phoneNumber: event.target.value })
                  }
                  required
                />
              </div>

              <button className="main-btn" type="submit">
                Sign Up
              </button>
            </form>

            <h3 className="login-heading">Already have an account?</h3>

            <form onSubmit={handleLogin}>
              <div className="form-row">
                <label>Username:</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm({ ...loginForm, username: event.target.value })
                  }
                  required
                />
              </div>

              <div className="form-row">
                <label>Password:</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm({
                      ...loginForm,
                      password: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <button className="main-btn" type="submit">
                Log In
              </button>
            </form>

            <button className="back-btn" onClick={() => setPage("home")}>
              Back to Home
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (page === "account") {
    return (
      <div className="app">
        {renderHeader()}
        {renderNavbar()}

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

                      <button className="small-green-btn" onClick={cancelEditParticulars}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>Username: {currentUser?.username || "-"}</p>
                    <p>Email: {currentUser?.email || "-"}</p>
                    <p>Phone Number: {currentUser?.phoneNumber || "-"}</p>

                    <button className="small-green-btn" onClick={startEditParticulars}>
                      Edit Particulars
                    </button>
                  </>
                )}

                <p className="account-balance">Account Balance: -</p>

                <div className="account-actions">
                  <button className="small-green-btn">Top Up</button>
                  <button className="small-green-btn">Withdraw</button>
                  <button className="small-green-btn">View Transaction History</button>
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
                          onClick={() => listing.id && handleUpdateListing(listing.id)}
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
                        {listing.price === 0 ? "Free" : `$${listing.price.toFixed(2)}`}
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
                          onClick={() => listing.id && handleDeleteListing(listing.id)}
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
      </div>
    );
  }

  if (page === "createListing") {
    return (
      <div className="app">
        {renderHeader()}
        {renderNavbar()}

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
      </div>
    );
  }

  if (page === "listing") {
    if (!selectedListing) {
      return (
        <div className="app">
          {renderHeader()}
          {renderNavbar()}

          <main className="listing-detail-page">
            <p>No listing selected.</p>

            <button
              className="back-to-home-btn"
              onClick={() => setPage("home")}
            >
              Back to Home
            </button>
          </main>
        </div>
      );
    }

    return (
      <div className="app">
        {renderHeader()}
        {renderNavbar()}

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

          <button
            className="back-to-home-btn"
            onClick={() => setPage("home")}
          >
            Back to Home
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      {renderHeader()}
      {renderNavbar()}

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
    </div>
  );
}

export default App;