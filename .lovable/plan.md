## Goal
Replace Sara's testimonial avatar with the uploaded photo.

## Steps
1. Copy `user-uploads://istockphoto-2255196256-2048x2048.jpg` → `src/assets/testimonial-sara.jpg`.
2. In `src/data/testimonials.ts`:
   - Add `import saraAvatar from "@/assets/testimonial-sara.jpg";` at top.
   - Replace Sara's `avatarUrl: "https://i.pravatar.cc/120?img=47"` with `avatarUrl: saraAvatar`.

No other changes.
