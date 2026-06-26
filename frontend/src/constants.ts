import type { ListingForm } from "./types";

export const emptyListingForm: ListingForm = {
  title: "",
  description: "",
  price: "",
  academicLevel: "",
  subject: "",
};

export const SUBJECT_OPTIONS = [
  "English",
  "Mathematics",
  "Science",
  "Chinese",
  "Malay",
  "Tamil",
  "History",
  "Geography",
  "Literature",
  "Economics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computing",
  "Others",
];

export const ACADEMIC_LEVEL_OPTIONS = [
  "Primary",
  "Secondary",
  "JC",
  "Polytechnic",
  "University",
  "Others",
];

export const PRICE_FILTER_OPTIONS = [
  "Free",
  "Below $5",
  "$5 - $10",
  "Above $10",
];