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
  TransactionItem,
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

  itemsSold: TransactionItem[];
  itemsPurchased: TransactionItem[];
  fetchTransactionItems: () => Promise<void>;
  purchaseListing: (listing: Listing) => Promise<boolean>;

  getListingById: (listingId: string | undefined) => Listing | null;
};

const AppContext = createContext<AppContextValue | null>(null);
const API_URL = import.meta.env.VITE_API_URL;

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
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  const [itemsSold, setItemsSold] = useState<TransactionItem[]>([]);
  const [itemsPurchased, setItemsPurchased] = useState<TransactionItem[]>([]);

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

  const myListings = useMemo(() => {
    if (!currentUser) return [];
    return listings.filter((listing) => listing.seller === currentUser.username);
  }, [listings, currentUser]);

  function clearMessage() {
    setMessage("");
  }

  function buildListingFilterParams() {
    const params = new URLSearchParams();

    const trimmedSearchTerm = searchTerm.trim();

    if (trimmedSearchTerm) {
      params.set("search", trimmedSearchTerm);
    }

    if (academicLevelFilter) {
      params.set("level_id", academicLevelFilter);
    }

    if (subjectFilter) {
      params.set("subject_id", subjectFilter);
    }

    switch (priceFilter) {
      case "Free":
        params.set("min_price", "0");
        params.set("max_price", "0");
        break;

      case "Below $5":
        params.set("min_price", "0.01");
        params.set("max_price", "4.99");
        break;

      case "$5 - $10":
        params.set("min_price", "5");
        params.set("max_price", "10");
        break;

      case "Above $10":
        params.set("min_price", "10.01");
        break;
    }

    return params;
  }

  async function fetchListings() {
    setIsLoadingListings(true);

    try {
      const response = await fetch(`${API_URL}/listings`);
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

      const fetchedListings = data.listings || [];

      setListings(fetchedListings);

      if (!hasActiveFilters) {
        setFilteredListings(fetchedListings);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to fetch listings");
    } finally {
      setIsLoadingListings(false);
    }
  }

  async function fetchFilteredListings(signal?: AbortSignal) {
    setIsLoadingListings(true);

    try {
      const params = buildListingFilterParams();
      const queryString = params.toString();

      const url = queryString
        ? `${API_URL}/listings?${queryString}`
        : `${API_URL}/listings`;

      const response = await fetch(url, { signal });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to filter listings");
      }

      setFilteredListings(data.listings || []);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessage(
        error instanceof Error ? error.message : "Failed to filter listings"
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoadingListings(false);
      }
    }
  }

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const delay = searchTerm.trim() ? 300 : 0;

    const timeoutId = window.setTimeout(() => {
      fetchFilteredListings(controller.signal);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    searchTerm,
    academicLevelFilter,
    subjectFilter,
    priceFilter,
  ]);

  useEffect(() => {
    if (currentUser?.accountId || currentUser?.id) {
      fetchTransactionItems();
    } else {
      setItemsSold([]);
      setItemsPurchased([]);
    }
  }, [currentUser?.accountId, currentUser?.id]);

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

    if (!/^\d{8}$/.test(signupForm.phoneNumber)) {
      setMessage("Phone number must contain exactly 8 digits.");
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
      const response = await fetch(`${API_URL}/signup`, {
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
      const response = await fetch(`${API_URL}/login`, {
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

    let createdListingId: string | number | null = null;
    let photoUploaded = false;

    try {
      const response = await fetch(`${API_URL}/createListing`, {
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

      createdListingId = data.id;

      const form = new FormData();
      form.append("listing_picture", listingForm.photoFile);

      const uploadResponse = await fetch(
        `${API_URL}/listings/${createdListingId}/listing-picture`,
        {
          method: "PATCH",
          body: form,
        }
      );

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || "Photo upload failed");
      }
      photoUploaded = true;

      setMessage("Listing created successfully!");
      setListingForm(emptyListingForm);
      await fetchListings();
      return true;
    } catch (error) {
          if (createdListingId !== null && !photoUploaded) {
      try {
        await fetch(
          `${API_URL}/deleteListing?seller=${encodeURIComponent(
            currentUser.username
          )}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: Number(createdListingId),
            }),
          }
        );
      } catch (cleanupError) {
        console.error(
          "Failed to clean up incomplete listing:",
          cleanupError
        );
      }
    }
      setMessage(error instanceof Error ? error.message : "Failed to create listing");
      return false;
    }
  }

  function saveCurrentUser(updatedUser: User) {
    setCurrentUser(updatedUser);
    localStorage.setItem("currentUser", JSON.stringify(updatedUser));
  }

  function getCurrentUserId() {
    const id = currentUser?.accountId ?? currentUser?.id;

    if (id === undefined || id === null || id === "") {
      return null;
    }

    const numericId = Number(id);
    return Number.isFinite(numericId) ? numericId : null;
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
      const response = await fetch(`${API_URL}${endpoint}`, {
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

  async function fetchTransactionItems() {
    const userId = getCurrentUserId();

    if (!userId) {
      setItemsSold([]);
      setItemsPurchased([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/transactions/${userId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch transaction history");
      }

      setItemsSold(data.itemsSold || []);
      setItemsPurchased(data.itemsPurchased || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function purchaseListing(listing: Listing) {
    setMessage("");

    if (!currentUser) {
      setMessage("Please sign in first.");
      return false;
    }

    const buyerID = getCurrentUserId();

    if (!buyerID) {
      setMessage("Unable to purchase because account ID is missing.");
      return false;
    }

    if (!listing.id) {
      setMessage("Unable to purchase because listing ID is missing.");
      return false;
    }

    if (listing.seller === currentUser.username) {
      setMessage("You cannot buy your own listing.");
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/purchaseListing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          buyerID,
          listingID: Number(listing.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Purchase failed");
      }

      const updatedBalance =
        data.buyerBalance !== undefined
          ? Number(data.buyerBalance)
          : Number(currentUser.balance ?? 0) - Number(listing.price);

      saveCurrentUser({
        ...currentUser,
        balance: Number(updatedBalance.toFixed(2)),
      });

      setListings((previousListings) =>
        previousListings.filter((item) => String(item.id) !== String(listing.id))
      );

      setFilteredListings((previousListings) =>
        previousListings.filter(
          (item) => String(item.id) !== String(listing.id)
        )
      );

      setItemsPurchased((previousItems) => [
        {
          title: listing.title,
          price: listing.price,
          buyerUsername: currentUser.username,
          sellerUsername: listing.seller,
          purchasedAt: new Date().toISOString(),
        },
        ...previousItems,
      ]);

      await fetchTransactionItems();

      setMessage("Purchase successful!");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Purchase failed");
      return false;
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

  async function updateUser() {
    setMessage("");

    if (!currentUser?.accountId) {
      setMessage("Unable to update user because account ID is missing.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/updateUser`, {
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
        `${API_URL}/users/${currentUser.accountId}/profile-picture`,
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
      const response = await fetch(`${API_URL}/updateListing`, {
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
          `${API_URL}/listings/${listingId}/listing-picture`,
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
        `${API_URL}/deleteListing?seller=${encodeURIComponent(currentUser.username)}`,
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

    itemsSold,
    itemsPurchased,
    fetchTransactionItems,
    purchaseListing,

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