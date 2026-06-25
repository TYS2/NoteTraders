import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import type { User, Listing, Page } from "./types";
import { emptyListingForm } from "./constants";
import Header from "./components/Header";
import Navbar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AccountPage from "./pages/AccountPage";
import CreateListingPage from "./pages/CreateListingPage";
import ListingPage from "./pages/ListingPage";


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

  const [ProfilePictureFile, setProfilePictureFile] =useState<File|null>(null);
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

      if (ProfilePictureFile){
        const form=new FormData();
        form.append("profile_picture", ProfilePictureFile)
        const pfpResponse = await fetch("/users/profile-picture",{
          method:"POST",
          body: form,
        })

        const pfpData = await response.json()
        if (!pfpResponse.ok){
          throw new Error(pfpData.error || "Profile picture upload failed")
        }
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

  function handleProfilePictureUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setProfilePicture(imageUrl);
    setProfilePictureFile(file)
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

  let content;

  if (page === "login") {
    content = (
      <LoginPage
        message={message}
        signupForm={signupForm}
        setSignupForm={setSignupForm}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        handleSignup={handleSignup}
        handleLogin={handleLogin}
        setPage={setPage}
      />
    );
  } else if (page === "account") {
    content = (
      <AccountPage
        message={message}
        currentUser={currentUser}
        isEditingParticulars={isEditingParticulars}
        editUserForm={editUserForm}
        setEditUserForm={setEditUserForm}
        startEditParticulars={startEditParticulars}
        cancelEditParticulars={cancelEditParticulars}
        handleUpdateUser={handleUpdateUser}
        profilePicture={profilePicture}
        handleProfilePictureUpload={handleProfilePictureUpload}
        myListings={myListings}
        setPage={setPage}
        editingListingId={editingListingId}
        editListingForm={editListingForm}
        setEditListingForm={setEditListingForm}
        startEditListing={startEditListing}
        cancelEditListing={cancelEditListing}
        handleUpdateListing={handleUpdateListing}
        handleDeleteListing={handleDeleteListing}
        handleViewListing={handleViewListing}
      />
    );
  } else if (page === "createListing") {
    content = (
      <CreateListingPage
        message={message}
        listingForm={listingForm}
        setListingForm={setListingForm}
        handleCreateListing={handleCreateListing}
      />
    );
  } else if (page === "listing") {
    content = (
      <ListingPage selectedListing={selectedListing} setPage={setPage} />
    );
  } else {
    content = (
      <HomePage
        message={message}
        isLoadingListings={isLoadingListings}
        filteredListings={filteredListings}
        handleViewListing={handleViewListing}
      />
    );
  }

  return (
    <div className="app">
      <Header setPage={setPage} />

      {page !== "login" && (
        <Navbar
          isLoggedIn={isLoggedIn}
          setPage={setPage}
          goToProtectedPage={goToProtectedPage}
          handleLogout={handleLogout}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          academicLevelFilter={academicLevelFilter}
          setAcademicLevelFilter={setAcademicLevelFilter}
          subjectFilter={subjectFilter}
          setSubjectFilter={setSubjectFilter}
          priceFilter={priceFilter}
          setPriceFilter={setPriceFilter}
        />
      )}

      {content}
    </div>
  );

  return (
    <div className="app">
      <Header setPage={setPage} />
      <Navbar
        isLoggedIn={isLoggedIn}
        setPage={setPage}
        goToProtectedPage={goToProtectedPage}
        handleLogout={handleLogout}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        academicLevelFilter={academicLevelFilter}
        setAcademicLevelFilter={setAcademicLevelFilter}
        subjectFilter={subjectFilter}
        setSubjectFilter={setSubjectFilter}
        priceFilter={priceFilter}
        setPriceFilter={setPriceFilter}
      />

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