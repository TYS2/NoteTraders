import type { ListingForm } from "./types";

export const emptyListingForm: ListingForm = {
  title: "",
  description: "",
  price: "",
  academicLevel: "",
  subject: "",
};

export const ACADEMIC_LEVEL_OPTIONS = [
  "Primary",
  "Secondary",
  "Junior College",
  "Polytechnic",
  "University",
];

export const SUBJECT_OPTIONS = [
  "English",
  "Math",
  "Science",
  "Chinese",
  "Computing",
  "Economics",
  "History",
  "Geography",
];

export const PRICE_FILTER_OPTIONS = [
  "Free",
  "Below $5",
  "$5 - $10",
  "Above $10",
];