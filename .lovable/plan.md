

## Update announcement banner styling

Three changes to `src/components/AnnouncementBanner.tsx`:

1. **Background color** — change from forest `#163300` to the primary brand lime `#9FE870`.
2. **Remove close button** — delete the `X` dismiss button entirely, along with the `dismissed` state, the `sessionStorage` logic, and the `SESSION_KEY` constant. Banner is always visible.
3. **Text color on lime background** — since lime is now the background, all text/icons currently white must become black (`#000` / forest `#163300` for strong contrast). Specifically:
   - All `text-white` spans → `text-[#163300]` (forest, reads as near-black on lime)
   - The lime-colored separators/italic text (`color: LIME`) → change to `#163300` so they remain visible
   - Marquee track stays the same; only colors and the dismiss button are affected

No other files need to change. The banner stays sticky at the top, 40px tall, marquee scrolling at 30s, pause-on-hover, reduced-motion fallback, and trilingual content all remain intact.

