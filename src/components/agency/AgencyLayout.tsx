import { ReactNode } from "react";

/**
 * Transparent wrapper kept for backwards compatibility.
 * The real chrome (Sidebar/Header/MobileNav) now lives in AgencyShell,
 * which is mounted once at the route layout level so the sidebar/logo
 * never unmount during navigation.
 */
export const AgencyLayout = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};
