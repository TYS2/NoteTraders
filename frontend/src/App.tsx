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
import SignUpPage from "./pages/SignUpPage";


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

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setCurrentUser(parsedUser);
      setIsLoggedIn(true);
      setProfilePicture(parsedUser.profilePictureUrl || null);
    }
  }, []);

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
  localStorage.removeItem("currentUser");

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

      const newUser = {
        username: signupForm.username,
        email: signupForm.email,
        phoneNumber: signupForm.phoneNumber,
        accountId: data.user,
        balance: 0,
      };

      setCurrentUser(newUser);
      setIsLoggedIn(true);
      localStorage.setItem("currentUser", JSON.stringify(newUser));

      setPage("home");
      setMessage(`Welcome to NoteTrade, ${signupForm.username}!`);

      setSignupForm({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        phoneNumber: "",
      });

      setLoginForm({
        username: "",
        password: "",
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

      const loggedInUser = {
        ...data.user,
        accountId: data.user.id,
        profilePictureUrl: data.user.profilePictureUrl,
      };

      setCurrentUser(loggedInUser);
      setProfilePicture(data.user.profilePictureUrl || null);
      setIsLoggedIn(true);
      localStorage.setItem("currentUser", JSON.stringify(loggedInUser));

      setPage("home");
      setMessage(`Welcome back, ${loggedInUser.username}!`);
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
          id: currentUser.accountId,
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

      const updatedUser = {
        ...data.user,
        accountId: data.user.id,
      };

      setCurrentUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

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

  async function handleProfilePictureUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file || !currentUser?.accountId) return;

    const previewUrl = URL.createObjectURL(file);
    setProfilePicture(previewUrl);

    try {
      const form = new FormData();
      form.append("profile_picture", file);

      const response = await fetch(
        `/users/${currentUser.accountId}/profile-picture`,
        {
          method: "PATCH",
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Profile picture upload failed");
      }

      const updatedUser = {
        ...currentUser,
        profilePictureUrl: data.profile_picture_url,
      };

      setCurrentUser(updatedUser);
      setProfilePicture(data.profile_picture_url);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      setMessage("Profile picture updated successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Profile picture upload failed"
      );
    }
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
    if (!currentUser) {
      setMessage("Please log in to delete a listing.");
      setPage("login");
      return;
    }

    try {
      const response = await fetch(
        `/deleteListing?seller=${encodeURIComponent(currentUser.username)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: Number(listingId),
          }),
        }
      );

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
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        handleLogin={handleLogin}
        setPage={setPage}
      />
    );
  } else if (page === "signup") {
    content = (
      <SignUpPage
        message={message}
        signupForm={signupForm}
        setSignupForm={setSignupForm}
        handleSignup={handleSignup}
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
        hasActiveFilters={
          searchTerm.trim() !== "" ||
          academicLevelFilter !== "" ||
          subjectFilter !== "" ||
          priceFilter !== ""
        }
      />
    );
  }

  return (
    <div className="app">
      <Header setPage={setPage} />

      <Navbar
        isLoggedIn={isLoggedIn}
        page={page}
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

      {content}
    </div>
  );
}

export default App;