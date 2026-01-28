import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
} from "nuqs/server";

export const lawyerSearchParamsParsers = {
  query: parseAsString.withDefault(""),
  practiceArea: parseAsString,
  state: parseAsString,
  city: parseAsString,
  experienceLevel: parseAsString,
  sort: parseAsString.withDefault("relevance"),
  page: parseAsInteger.withDefault(1),
};

export const lawyerSearchParamsCache = createSearchParamsCache(
  lawyerSearchParamsParsers
);
