import {
  createSearchParamsCache,
  parseAsString,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs/server";

export const firmSortOptions = ["lawyers", "experience", "name"] as const;
export type FirmSortOption = (typeof firmSortOptions)[number];

export const firmSearchParamsParsers = {
  query: parseAsString.withDefault(""),
  state: parseAsString,
  city: parseAsString,
  practiceArea: parseAsString,
  sort: parseAsStringLiteral(firmSortOptions).withDefault("lawyers"),
  page: parseAsInteger.withDefault(1),
};

export const firmSearchParamsCache = createSearchParamsCache(
  firmSearchParamsParsers
);
