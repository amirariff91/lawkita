import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
  parseAsBoolean,
} from "nuqs/server";

export const lawyerSearchParamsParsers = {
  query: parseAsString.withDefault(""),
  practiceArea: parseAsString,
  state: parseAsString,
  city: parseAsString,
  experienceLevel: parseAsString,
  showInactive: parseAsBoolean.withDefault(false),
  sort: parseAsString.withDefault("relevance"),
  page: parseAsInteger.withDefault(1),
};

export const lawyerSearchParamsCache = createSearchParamsCache(
  lawyerSearchParamsParsers
);
