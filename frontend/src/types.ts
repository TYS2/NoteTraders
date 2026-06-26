export type Page =
  | "home"
  | "login"
  | "signup"
  | "account"
  | "createListing"
  | "listing";
  
export type User = {
  id?: string;
  accountId?: number;
  username: string;
  email: string;
  phoneNumber?: string;
  balance?: number;
  profilePictureUrl?: string;
};

export type Listing = {
  id?: string;
  title: string;
  description: string;
  price: number;
  seller: string;
  academicLevel: string;
  subject: string;
};

export type ListingForm = {
  title: string;
  description: string;
  price: string;
  academicLevel: string;
  subject: string;
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