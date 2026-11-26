import { describe, expect, test } from "bun:test";
import {
  directionsHref,
  formatFirmAddress,
  mapOpeningHours,
  telHref,
  whatsappHref,
} from "./firm-contact";

describe("telHref", () => {
  test("keeps digits and a leading plus", () => {
    expect(telHref("03-2273 1919")).toBe("tel:0322731919");
    expect(telHref("+60 3 2273 1919")).toBe("tel:+60322731919");
    expect(telHref("n/a")).toBeNull();
    expect(telHref(null)).toBeNull();
  });
});

describe("whatsappHref", () => {
  test("national digits become an international wa.me link", () => {
    expect(whatsappHref("0139021388")).toBe("https://wa.me/60139021388");
    expect(whatsappHref("01155833109")).toBe("https://wa.me/601155833109");
  });

  test("anything but plain national digits gets no link", () => {
    expect(whatsappHref("013-902 1388")).toBeNull();
    expect(whatsappHref("https://wa.me/60139021388")).toBeNull();
    expect(whatsappHref("60139021388")).toBeNull();
    expect(whatsappHref("")).toBeNull();
    expect(whatsappHref(undefined)).toBeNull();
  });
});

describe("formatFirmAddress", () => {
  test("leaves a complete address alone", () => {
    const address =
      "Level 22, Axiata Tower, No. 9, Jalan Stesen Sentral 5, 50470, Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur";
    expect(
      formatFirmAddress({ address, postcode: "50470", city: "Kuala Lumpur", state: "Kuala Lumpur" })
    ).toBe(address);
  });

  test("adds a missing postcode, city and state", () => {
    expect(
      formatFirmAddress({ address: "12 Jalan Sultan,", postcode: "30000", city: "Ipoh", state: "Perak" })
    ).toBe("12 Jalan Sultan, 30000 Ipoh, Perak");
  });

  test("never adds a second, conflicting postcode", () => {
    expect(
      formatFirmAddress({
        address: "Jalan Wong Ah Fook, 80000, Johor Bahru, Johore",
        postcode: "80250",
        city: "Johor Bahru",
        state: "Johor",
      })
    ).toBe("Jalan Wong Ah Fook, 80000, Johor Bahru, Johore");
  });

  test("no address, nothing to show", () => {
    expect(formatFirmAddress({ address: null, postcode: "50000", city: "X", state: "Y" })).toBeNull();
  });
});

describe("directionsHref", () => {
  test("uses coordinates when valid", () => {
    expect(directionsHref(3.1466, 101.6958)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=3.1466,101.6958"
    );
  });

  test("rejects missing or impossible coordinates", () => {
    expect(directionsHref(null, 101.6)).toBeNull();
    expect(directionsHref(0, 0)).toBeNull();
    expect(directionsHref(95, 101)).toBeNull();
    expect(directionsHref(Number.NaN, 101)).toBeNull();
  });
});

describe("mapOpeningHours", () => {
  test("maps 24-hour day-range forms", () => {
    expect(mapOpeningHours("Mon-Fri 09:00-18:00")).toEqual(["Mo-Fr 09:00-18:00"]);
    expect(mapOpeningHours("Mo-Fr 09:00-18:00")).toEqual(["Mo-Fr 09:00-18:00"]);
    expect(mapOpeningHours("Mo,Tu,We,Th,Fr 09:00-17:00")).toEqual(["Mo,Tu,We,Th,Fr 09:00-17:00"]);
    expect(
      mapOpeningHours("Monday,Tuesday,Wednesday,Thursday,Friday,Saturday,Sunday 09:00-17:00")
    ).toEqual(["Mo,Tu,We,Th,Fr,Sa,Su 09:00-17:00"]);
  });

  test("maps several segments and drops closed days", () => {
    expect(mapOpeningHours("Mon-Thu 09:00-17:00; Fri 09:00-16:00")).toEqual([
      "Mo-Th 09:00-17:00",
      "Fr 09:00-16:00",
    ]);
    expect(mapOpeningHours("Mo 09:00-18:00, Tu 09:00-18:00")).toEqual([
      "Mo 09:00-18:00",
      "Tu 09:00-18:00",
    ]);
    expect(mapOpeningHours("Mo,Tu,We,Th,Fr 09:00-18:00; Sa,Su closed")).toEqual([
      "Mo,Tu,We,Th,Fr 09:00-18:00",
    ]);
  });

  test("skips anything it would have to guess at", () => {
    expect(mapOpeningHours("Monday to Friday 9:00 am - 6:00 pm")).toBeNull();
    expect(mapOpeningHours("MON-FRI 09:00 am – 6:00 pm")).toBeNull();
    expect(mapOpeningHours("Monday - Friday: 9:00 AM - 6:00 PM")).toBeNull();
    expect(mapOpeningHours("Sun-Sat 09:00-17:00; Mon-Fri 09:00-18:00")).toBeNull();
    expect(mapOpeningHours("Mon-Fri 18:00-09:00")).toBeNull();
    expect(mapOpeningHours("Sa,Su closed")).toBeNull();
    expect(mapOpeningHours("")).toBeNull();
    expect(mapOpeningHours(null)).toBeNull();
  });
});
