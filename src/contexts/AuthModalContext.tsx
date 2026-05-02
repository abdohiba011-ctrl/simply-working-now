import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AuthModalTab = "login" | "signup";

export interface AuthModalContext {
  /** Bike or page name shown in a small banner at the top of the modal. */
  bikeName?: string;
  /** Generic context label, e.g. "booking". */
  label?: string;
  /** Path to navigate to after successful auth. */
  returnTo?: string;
  /** Arbitrary state to persist in sessionStorage and restore after auth. */
  preserveState?: Record<string, unknown>;
}

interface OpenOptions extends AuthModalContext {}

interface AuthModalState {
  isOpen: boolean;
  tab: AuthModalTab;
  ctx: AuthModalContext;
  openAuthModal: (tab?: AuthModalTab, options?: OpenOptions) => void;
  closeAuthModal: () => void;
  setTab: (tab: AuthModalTab) => void;
}

const Ctx = createContext<AuthModalState | null>(null);

const PRESERVE_KEY = "motonita_auth_resume_state";

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<AuthModalTab>("login");
  const [ctx, setCtx] = useState<AuthModalContext>({});

  const openAuthModal = useCallback((nextTab: AuthModalTab = "login", options: OpenOptions = {}) => {
    setTab(nextTab);
    setCtx(options);
    if (options.preserveState) {
      try {
        sessionStorage.setItem(
          PRESERVE_KEY,
          JSON.stringify({ returnTo: options.returnTo, state: options.preserveState }),
        );
      } catch {
        /* ignore */
      }
    }
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
    setCtx({});
  }, []);

  // Lock body scroll + hide site header when open
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("auth-modal-open");
    return () => {
      document.body.style.overflow = previous;
      document.body.classList.remove("auth-modal-open");
    };
  }, [isOpen]);

  const value = useMemo<AuthModalState>(
    () => ({ isOpen, tab, ctx, openAuthModal, closeAuthModal, setTab }),
    [isOpen, tab, ctx, openAuthModal, closeAuthModal],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthModal() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuthModal must be used within AuthModalProvider");
  return v;
}

export function consumeAuthResumeState(): { returnTo?: string; state?: Record<string, unknown> } | null {
  try {
    const raw = sessionStorage.getItem(PRESERVE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PRESERVE_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
