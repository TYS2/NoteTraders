import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  EditUserForm,
  Listing,
  ListingForm,
  LoginForm,
  SignupForm,
  User,
} from "../types";
import { emptyListingForm } from "../constants";

type AppContextValue = {
  currentUser: User | null;
  isLoggedIn: boolean;

  listings: Listing[];
  filteredListings: Listing[];
  myListings: Listing[];
  isLoadingListings: boolean;
  hasActiveFilters: boolean;

  signupForm: SignupForm;
  setSignupForm: Dispatch<SetStateAction<SignupForm>>;
  loginForm: LoginForm;
  setLoginForm: Dispatch<SetStateAction<LoginForm>>;
  listingForm: ListingForm;
  setListingForm: Dispatch<SetStateAction<ListingForm>>;

  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  clearMessage: () => void;

  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  academicLevelFilter: string;
  setAcademicLevelFilter: Dispatch<SetStateAction<string>>;
  subjectFilter: string;
  setSubjectFilter: Dispatch<SetStateAction<string>>;
  priceFilter: string;
  setPriceFilter: Dispatch<SetStateAction<string>>;

  profilePicture: string | null;
  isEditingParticulars: boolean;
  editUserForm: EditUserForm;
  setEditUserForm: Dispatch<SetStateAction<EditUserForm>>;

  editingListingId: string | null;
  editListingForm: ListingForm;
  setEditListingForm: Dispatch<SetStateAction<ListingForm>>;

  fetchListings: () => Promise<void>;
  signup: () => Promise<boolean>;
  login: () => Promise<boolean>;
  logout: () => void;
  createListing: () => Promise<boolean>;

  topUpBalance: (amount: number) => Promise<boolean>;
  withdrawBalance: (amount: number) => Promise<boolean>;

  startEditParticulars: () => void;
  cancelEditParticulars: () => void;
  updateUser: () => Promise<void>;
  handleProfilePictureUpload: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => Promise<void>;

  startEditListing: (listing: Listing) => void;
  cancelEditListing: () => void;
  updateListing: (listingId: string | number) => Promise<void>;
  deleteListing: (listingId: string | number) => Promise<void>;

  getListingById: (listingId: string | undefined) => Listing | null;
};

const AppContext = createContext<AppContextValue | null>(null);

function readStoredUser() {
  try {
    const savedUser = localStorage.getItem("currentUser");
    return savedUser ? (JSON.parse(savedUser) as User) : null;
  } catch {
    localStorage.removeItem("currentUser");
    return null;
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

function normalizeUser(user: User): User {
  return {
    ...user,
    accountId: user.accountId ?? user.id,
    profilePictureUrl: user.profilePictureUrl,
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const storedUser = useMemo(() => readStoredUser(), []);

  const [currentUser, setCurrentUser] = useState<User | null>(storedUser);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  const [signupForm, setSignupForm] = useState<SignupForm>({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    phoneNumber: "",
  });

  const [loginForm, setLoginForm] = useState<LoginForm>({
    username: "",
    password: "",
  });

  const [listingForm, setListingForm] = useState<ListingForm>(emptyListingForm);
  const [message, setMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [academicLevelFilter, setAcademicLevelFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");

  const [profilePicture, setProfilePicture] = useState<string | null>(
    storedUser?.profilePictureUrl || null
  );

  const [isEditingParticulars, setIsEditingParticulars] = useState(false);
  const [editUserForm, setEditUserForm] = useState<EditUserForm>({
    username: "",
    email: "",
    phoneNumber: "",
  });

  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [editListingForm, setEditListingForm] =
    useState<ListingForm>(emptyListingForm);

  const isLoggedIn = currentUser !== null;

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    academicLevelFilter !== "" ||
    subjectFilter !== "" ||
    priceFilter !== "";

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesSearch =
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.subject.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAcademicLevel =
        !academicLevelFilter || listing.academicLevel === academicLevelFilter;

      const matchesSubject = !subjectFilter || listing.subject === subjectFilter;

      const matchesPrice =
        !priceFilter ||
        (priceFilter === "Free" && listing.price === 0) ||
        (priceFilter === "Below $5" && listing.price > 0 && listing.price < 5) ||
        (priceFilter === "$5 - $10" &&
          listing.price >= 5 &&
          listing.price <= 10) ||
        (priceFilter === "Above $10" && listing.price > 10);

      return matchesSearch && matchesAcademicLevel && matchesSubject && matchesPrice;
    });
  }, [listings, searchTerm, academicLevelFilter, subjectFilter, priceFilter]);

  const myListings = useMemo(() => {
    if (!currentUser) return [];
    return listings.filter((listing) => listing.seller === currentUser.username);
  }, [listings, currentUser]);

  function clearMessage() {
    setMessage("");
  }

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

  async function signup() {
    setMessage("");

    if (
      !signupForm.username.trim() ||
      !signupForm.password.trim() ||
      !signupForm.confirmPassword.trim() ||
      !signupForm.email.trim() ||
      !signupForm.phoneNumber.trim()
    ) {
      setMessage("Please fill in all fields");
      return false;
    }

    if (!isValidPassword(signupForm.password)) {
      setMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
      return false;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setMessage("Passwords do not match");
      return false;
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

      const backendUser = typeof data.user === "object" ? data.user : null;

      const newUser: User = {
        username: backendUser?.username ?? signupForm.username,
        email: backendUser?.email ?? signupForm.email,
        phoneNumber: backendUser?.phoneNumber ?? signupForm.phoneNumber,
        accountId: backendUser?.accountId ?? backendUser?.id ?? data.user,
        balance: backendUser?.balance ?? 0,
        profilePictureUrl: backendUser?.profilePictureUrl,
      };

      setCurrentUser(newUser);
      setProfilePicture(newUser.profilePictureUrl || null);
      localStorage.setItem("currentUser", JSON.stringify(newUser));

      setMessage(`Welcome to NoteTrade, ${newUser.username}!`);

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

      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Signup failed");
      return false;
    }
  }

  async function login() {
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

      const loggedInUser = normalizeUser(data.user);

      setCurrentUser(loggedInUser);
      setProfilePicture(loggedInUser.profilePictureUrl || null);
      localStorage.setItem("currentUser", JSON.stringify(loggedInUser));

      setMessage(`Welcome back, ${loggedInUser.username}!`);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
      return false;
    }
  }

  function logout() {
    setCurrentUser(null);
    setProfilePicture(null);
    localStorage.removeItem("currentUser");
    setMessage("Logged out successfully.");
  }

  async function createListing() {
    setMessage("");

    if (!currentUser) {
      setMessage("Please sign in first.");
      return false;
    }

    if (!listingForm.photoFile) {
      setMessage("Please upload a photo of your notes.");
      return false;
    }

    if (!listingForm.photoFile.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      return false;
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

      const createdListingId = data.id;

      const form = new FormData();
      form.append("listing_picture", listingForm.photoFile);

      const uploadResponse = await fetch(
        `/listings/${createdListingId}/listing-picture`,
        {
          method: "PATCH",
          body: form,
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || "Photo upload failed");
      }

      setMessage("Listing created successfully!");
      setListingForm(emptyListingForm);
      await fetchListings();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create listing");
      return false;
    }
  }

  function saveCurrentUser(updatedUser: User) {
    setCurrentUser(updatedUser);
    localStorage.setItem("currentUser", JSON.stringify(updatedUser));
  }

  function getValidTransactionAmount(amount: number) {
    const validAmount = Number(amount);

    if (!Number.isFinite(validAmount) || validAmount <= 0) {
      setMessage("Please enter an amount greater than $0.");
      return null;
    }

    return Number(validAmount.toFixed(2));
  }

  async function changeBalance(
    endpoint: "/addBalance" | "/withdrawBalance",
    amount: number,
    successMessage: string
  ) {
    setMessage("");

    if (!currentUser?.accountId) {
      setMessage("Please sign in first.");
      return false;
    }

    const validAmount = getValidTransactionAmount(amount);
    if (validAmount === null) return false;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: Number(currentUser.accountId),
          amount: validAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Transaction failed");
      }

      const currentBalance = Number(currentUser.balance ?? 0);
      const nextBalance =
        endpoint === "/addBalance"
          ? currentBalance + validAmount
          : currentBalance - validAmount;

      saveCurrentUser({
        ...currentUser,
        balance: Number(nextBalance.toFixed(2)),
      });

      setMessage(successMessage);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transaction failed");
      return false;
    }
  }

  async function topUpBalance(amount: number) {
    return changeBalance("/addBalance", amount, "Top up successful!");
  }

  async function withdrawBalance(amount: number) {
    return changeBalance("/withdrawBalance", amount, "Withdraw successful!");
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

  async function updateUser() {
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
        ...normalizeUser(data.user),
        profilePictureUrl:
          data.user.profilePictureUrl ?? currentUser.profilePictureUrl,
      };

      setCurrentUser(updatedUser);
      setProfilePicture(updatedUser.profilePictureUrl || profilePicture);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      setIsEditingParticulars(false);
      setMessage("Particulars updated successfully!");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to update particulars"
      );
    }
  }

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
    setEditingListingId(listing.id === undefined ? null : String(listing.id));

    setEditListingForm({
      title: listing.title,
      description: listing.description,
      price: String(listing.price),
      academicLevel: listing.academicLevel,
      subject: listing.subject,
      photoFile: null,
    });
  }

  function cancelEditListing() {
    setEditingListingId(null);
    setEditListingForm(emptyListingForm);
  }

  async function updateListing(listingId: string | number) {
    if (!currentUser) return;

    setMessage("");

    if (
      editListingForm.photoFile &&
      !editListingForm.photoFile.type.startsWith("image/")
    ) {
      setMessage("Please upload an image file.");
      return;
    }

    if (
      editListingForm.photoFile &&
      editListingForm.photoFile.size > 5 * 1024 * 1024
    ) {
      setMessage("Photo must be 5MB or smaller.");
      return;
    }

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

      if (editListingForm.photoFile) {
        const form = new FormData();
        form.append("listing_picture", editListingForm.photoFile);

        const uploadResponse = await fetch(
          `/listings/${listingId}/listing-picture`,
          {
            method: "PATCH",
            body: form,
          }
        );

        const uploadData = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadData.error || "Listing updated, but photo upload failed");
        }
      }

      setMessage("Listing updated successfully!");
      setEditingListingId(null);
      setEditListingForm(emptyListingForm);
      await fetchListings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update listing");
    }
  }

  async function deleteListing(listingId: string | number) {
    if (!currentUser) {
      setMessage("Please sign in to delete a listing.");
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

  function getListingById(listingId: string | undefined) {
    if (!listingId) return null;
    return listings.find((listing) => String(listing.id) === listingId) || null;
  }

  const value: AppContextValue = {
    currentUser,
    isLoggedIn,

    listings,
    filteredListings,
    myListings,
    isLoadingListings,
    hasActiveFilters,

    signupForm,
    setSignupForm,
    loginForm,
    setLoginForm,
    listingForm,
    setListingForm,

    message,
    setMessage,
    clearMessage,

    searchTerm,
    setSearchTerm,
    academicLevelFilter,
    setAcademicLevelFilter,
    subjectFilter,
    setSubjectFilter,
    priceFilter,
    setPriceFilter,

    profilePicture,
    isEditingParticulars,
    editUserForm,
    setEditUserForm,

    editingListingId,
    editListingForm,
    setEditListingForm,

    fetchListings,
    signup,
    login,
    logout,
    createListing,

    topUpBalance,
    withdrawBalance,

    startEditParticulars,
    cancelEditParticulars,
    updateUser,
    handleProfilePictureUpload,

    startEditListing,
    cancelEditListing,
    updateListing,
    deleteListing,

    getListingById,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }

  return context;
}