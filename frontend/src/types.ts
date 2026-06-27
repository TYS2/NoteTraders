export type User = {
  id?: string | number;
  accountId?: string | number;
  username: string;
  password?: string;
  email: string;
  phoneNumber?: string;
  balance?: number;
  profilePictureUrl?: string;
};

export type Listing = {
  id?: string | number;
  title: string;
  description: string;
  price: number;
  seller: string;
  academicLevel: string;
  subject: string;
  photoUrl?: string;
};

export type ListingForm = {
  title: string;
  description: string;
  price: string;
  academicLevel: string;
  subject: string;
  photoFile: File | null;
};

export type SignupForm = {
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  phoneNumber: string;
};

export type LoginForm = {
  username: string;
  password: string;
};

export type EditUserForm = {
  username: string;
  email: string;
  phoneNumber: string;
};

export type TransactionItem = {
  id?: string | number;
  listingID?: string | number;
  title: string;
  price: number;
  buyerUsername: string;
  sellerUsername: string;
  purchasedAt?: string;
};

export type TransactionHistoryEntry = {
  id?: string | number;
  transactionType: "Purchased" | "Sold" | "Top Up" | "Withdraw";
  title: string;
  amount: number;
  createdAt: string;
};