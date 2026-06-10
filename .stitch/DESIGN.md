# Design System Document: JobPulse Global Redesign

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Silent Partner."** 

In the high-stakes world of executive job searches, the interface must never compete with the data. We are moving away from the "busy" nature of traditional SaaS dashboards toward a high-end, editorial aesthetic that feels more like a luxury architectural portfolio than a software tool. 

The system achieves its premium feel through **Intentional Void**—using generous whitespace (Scale 8 to 16) as a functional element rather than a byproduct. By favoring flat, tonal shifts over traditional borders or shadows, we create a UI that feels "carved" out of a single piece of dark slate.

## 2. Colors & Surface Architecture
The palette is rooted in a monochromatic spectrum of "Deep Charcoal" and "Flat Dark Grey," punctuated by a surgical use of Indigo.

### Palette Strategy
- **Base (Surface/Background):** `#0A0A0A`. The true black foundation that provides the high-contrast "void" for content.
- **Surface Tiers:** Use the `surface-container` tokens to create depth.
    - `surface-container-lowest`: `#0E0E0E` (Main layout containers)
    - `surface-container-low`: `#1C1B1B` (Secondary modules)
    - `surface-container-high`: `#2A2A2A` (Active/Hover states)
- **Primary Accent:** `Indigo (#6366F1)`. Reserved strictly for primary actions, success states, and progress indicators.

### The "No-Line" Rule
To maintain the "Flat High-End" vibe, 1px solid borders are strictly prohibited for layout sectioning. Separation must be achieved through:
1. **Background Contrast:** A `surface-container-low` card sitting on a `surface` background.
2. **Asymmetric Spacing:** Using a 2x jump in the spacing scale (e.g., from `3.5` to `7`) to define a new content area.

### Signature Textures
While the aesthetic is flat, we avoid "dead" colors. Use a subtle linear gradient on primary buttons: `primary` (#C0C1FF) to `primary-container` (#8083FF) at a 135-degree angle. This provides a "metallic" sheen that feels expensive without resorting to skeuomorphism.

## 3. Typography
We utilize **Inter** exclusively to lean into its neutral, technical perfection.

- **Display & Headlines:** Set at `600` weight. Use `display-lg` for dashboard welcomes to create an editorial "magazine" feel. Keep tracking at `-0.02em` for headings to increase visual density.
- **Body & Labels:** Set at `400` weight. Use `body-md` for standard data.
- **The Power of Hierarchy:** Always pair a `headline-sm` title with a `label-sm` (muted grey) subtitle. This "Heavy/Light" pairing is the signature of this design system’s information architecture.

## 4. Elevation & Depth
In a "no glassmorphism, no heavy shadows" environment, elevation is communicated through **Tonal Layering**.

- **The Layering Principle:** Stacking should follow a logical "light source" from the top. Objects physically "closer" to the user use higher surface tokens (lighter greys). 
    - *Example:* Dashboard Background (#0A0A0A) → Job Card (#171717) → Hover State (#2A2A2A).
- **Ambient Light (The Ghost Border):** When content requires extreme definition (like an Input field or a Modal), use the `outline-variant` token at **8% opacity** (`rgba(255,255,255,0.08)`). This is a "Ghost Border"—it should be felt, not seen.
- **Zero Shadow Policy:** Shadows are replaced by 1px "Ghost Borders." If a floating element (like a Popover) absolutely requires a shadow, it must be `surface-container-lowest` color with a 40px blur and 0px spread, making it look like a soft glow rather than a drop shadow.

## 5. Components

### Buttons
- **Primary:** High-contrast Indigo gradient. `8px` (xl) border radius. No border. Text: `on-primary`.
- **Secondary:** Surface-container-high background with a "Ghost Border." Text: `primary-fixed`.
- **Tertiary:** Ghost border only, or purely text-based with `400` weight.

### Input Fields
- **Default State:** Background: `surface-container-lowest`. Border: Ghost Border (8% white). 
- **Focus State:** Border: `primary` at 40% opacity. No "glow" effects. 
- **Typography:** Placeholder text must be `muted light grey` (#A1A1AA) at `label-md`.

### Cards & Lists
- **The Forbid Rule:** Never use divider lines between list items. 
- **The Alternative:** Use `Spacing 3` (1rem) between items. For high-density lists, use alternating row backgrounds: `surface` and `surface-container-low`.
- **Rounding:** All cards must use `DEFAULT` (0.25rem) for a sharp, professional look, or `lg` (0.5rem) for a friendlier "User Profile" feel.

### Application-Specific Components
- **The Status Ribbon:** For job application statuses (e.g., "Interviewing"), use a small `0.125rem` vertical pill to the left of the text rather than a full-color background badge. This maintains the minimalist aesthetic.
- **The Match Score Gauge:** Use a thin 2px circular stroke using the `Indigo` accent against a `surface-variant` track.

## 6. Do's and Don'ts

### Do
- **Do** use asymmetric layouts. Align your primary CTA to the far right with significant "dead space" to its left to draw the eye.
- **Do** use `1.7rem` (Spacing 5) as your standard "breath" between modules.
- **Do** treat typography as the primary UI element. If the page looks empty, increase the font size of the header before adding a graphic.

### Don'ts
- **Don't** use pure black (#000000) for anything other than text in extreme high-contrast needs.
- **Don't** use standard 100% opaque borders. They break the "Flat" immersion and look dated.
- **Don't** use icons as primary navigation labels. Always pair icons with `label-md` text to ensure an authoritative, "Executive" tone.
- **Don't** use glassmorphism or background blurs. This system relies on the solidity of the "Flat" aesthetic to convey stability and trust.
