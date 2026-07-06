"use client";
import { createContext, useContext, useState } from "react";

interface NavVisibilityContextValue {
  isExploreActive: boolean;
  setIsExploreActive: (active: boolean) => void;
}

const NavVisibilityContext = createContext<NavVisibilityContextValue | null>(null);

export function NavVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [isExploreActive, setIsExploreActive] = useState(false);
  return (
    <NavVisibilityContext.Provider value={{ isExploreActive, setIsExploreActive }}>
      {children}
    </NavVisibilityContext.Provider>
  );
}

export function useNavVisibility() {
  const ctx = useContext(NavVisibilityContext);
  if (!ctx) throw new Error("useNavVisibility must be used within NavVisibilityProvider");
  return ctx;
}
