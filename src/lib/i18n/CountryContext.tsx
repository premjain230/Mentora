"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { Country } from "@/src/types/curriculum";
import { COUNTRIES } from "@/lib/learning/curriculum/countries";
import { formatCurrency } from "./index";

interface CountryContextType {
  selectedCountry: string;
  country: Country;
  detectedCountry: string | null;
  showNotice: boolean;
  setCountry: (code: string) => void;
  dismissNotice: () => void;
  switchCountry: (code: string) => void;
  formatPrice: (amount: number) => string;
}

const DEFAULT_COUNTRY_CODE = "IN";

const CountryContext = createContext<CountryContextType>({
  selectedCountry: DEFAULT_COUNTRY_CODE,
  country: COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE) || COUNTRIES[0],
  detectedCountry: null,
  showNotice: false,
  setCountry: () => {},
  dismissNotice: () => {},
  switchCountry: () => {},
  formatPrice: (amt) => `₹${amt}`,
});

export function CountryProvider({ children }: { children: React.ReactNode }) {
  const [selectedCountry, setSelectedCountry] = useState<string>(DEFAULT_COUNTRY_CODE);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [showNotice, setShowNotice] = useState<boolean>(false);

  // Load user country preference from localStorage or detect via timezone
  useEffect(() => {
    try {
      const stored = localStorage.getItem("learning_allied_country");
      let active = stored;

      // Detect country from client timezone
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      let detected: string | null = null;

      if (tz.includes("Kolkata") || tz.includes("Calcutta")) detected = "IN";
      else if (tz.startsWith("America/New_York") || tz.startsWith("America/Chicago") || tz.startsWith("America/Los_Angeles") || tz.startsWith("America/Denver")) detected = "US";
      else if (tz.startsWith("Europe/London")) detected = "GB";
      else if (tz.startsWith("America/Toronto") || tz.startsWith("America/Vancouver") || tz.startsWith("America/Edmonton")) detected = "CA";
      else if (tz.startsWith("Australia/")) detected = "AU";
      else if (tz.startsWith("Pacific/Auckland")) detected = "NZ";
      else if (tz.startsWith("Asia/Singapore")) detected = "SG";
      else if (tz.startsWith("Asia/Dubai")) detected = "AE";
      else if (tz.startsWith("Asia/Riyadh")) detected = "SA";
      else if (tz.startsWith("Asia/Kuala_Lumpur")) detected = "MY";
      else if (tz.startsWith("Asia/Karachi")) detected = "PK";
      else if (tz.startsWith("Asia/Dhaka")) detected = "BD";
      else if (tz.startsWith("Africa/Johannesburg")) detected = "ZA";
      else if (tz.startsWith("Africa/Lagos")) detected = "NG";
      else if (tz.startsWith("Europe/Dublin")) detected = "IE";

      setDetectedCountry(detected);

      if (!active) {
        active = detected || DEFAULT_COUNTRY_CODE;
        localStorage.setItem("learning_allied_country", active);
      }

      setSelectedCountry(active);

      // If user had a saved country, but is detected elsewhere, show non-intrusive banner
      const dismissed = sessionStorage.getItem("learning_allied_country_notice_dismissed");
      if (detected && detected !== active && !dismissed) {
        setShowNotice(true);
      }
    } catch (_) {
      // Safe fallback for SSR or restricted environments
    }
  }, []);

  const country = useMemo(() => {
    return COUNTRIES.find((c) => c.code === selectedCountry) || COUNTRIES[0];
  }, [selectedCountry]);

  const setCountry = (code: string) => {
    const valid = COUNTRIES.find((c) => c.code === code);
    if (!valid) return;
    setSelectedCountry(valid.code);
    try {
      localStorage.setItem("learning_allied_country", valid.code);
    } catch (_) {}
    setShowNotice(false);
  };

  const switchCountry = (code: string) => {
    setCountry(code);
  };

  const dismissNotice = () => {
    setShowNotice(false);
    try {
      sessionStorage.setItem("learning_allied_country_notice_dismissed", "true");
    } catch (_) {}
  };

  const formatPrice = (amount: number) => {
    return formatCurrency(amount, country.defaultCurrency, country.defaultLocale);
  };

  return (
    <CountryContext.Provider
      value={{
        selectedCountry,
        country,
        detectedCountry,
        showNotice,
        setCountry,
        dismissNotice,
        switchCountry,
        formatPrice,
      }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  return useContext(CountryContext);
}
