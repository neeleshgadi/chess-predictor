---
name: modern-analytical-ui
description: UI/UX design standards for the "Modern Analytical" aesthetic. Adheres to specific typography, color, spacing, and highlighter effects for a premium interface.
---

# UI/UX Design Standards: "Modern Analytical" Aesthetic

When writing HTML/CSS or generating UI components, you must adhere strictly to the following design principles to ensure a premium, highly legible, and structured interface.

## 1. Typography Setup (Space Mono)

- **Font Family:** Always use 'Space Mono'.
- **Implementation:** Load from Google Fonts. Always include the following import and root variables in the global CSS:

  ```css
  @import url("https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400;1,700&display=swap");

  :root {
    --font-primary: "Space Mono", "Courier New", Courier, monospace;
  }

  body {
    font-family: var(--font-primary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  ```

## 2. Typography Hierarchy & Weights

Space Mono only supports 400 (Regular) and 700 (Bold).

- **Body Text:** `font-weight: 400;` (Regular).
- **Labels/Subheadings:** `font-weight: 400; letter-spacing: 0.05em; text-transform: uppercase;`
- **Primary Headings:** `font-weight: 700; letter-spacing: -0.02em;` (Tight tracking is required for headings).

## 3. Color & Contrast Strategy

- **Text Colors:** Never use pure black (#000000).
- **Primary Headings:** #0F172A (Slate 900).
- **Body Text:** #334155 (Slate 700).
- **Secondary/Muted Text:** #64748B (Slate 500).
- **Backgrounds:** Keep backgrounds minimal—pure white (#FFFFFF) or an extremely light gray (#F8FAFC).

## 4. The "Textbook Highlighter" Concept

When important terms, key metrics, or critical sentences need emphasis, never use standard bolding or full background colors. Use a stylized "highlighter" effect.

### CSS Implementation:

Add these variables and the utility class to the global CSS:

```css
:root {
  --highlight-yellow: #fde047;
  --highlight-mint: #86efac;
  --highlight-cyan: #67e8f9;
  --highlight-pink: #f9a8d4;
  --highlight-color: var(--highlight-yellow); /* Default */
}

.text-highlight {
  background: linear-gradient(
    to right,
    var(--highlight-color),
    var(--highlight-color)
  );
  background-repeat: no-repeat;
  background-size: 100% 40%; /* Only covers the bottom 40% of the text */
  background-position: 0 88%; /* Pushes the highlight down */
  font-weight: 500; /* Slight weight increase */
  padding-inline: 2px; /* Slight breathing room on the edges */
}

/* Optional: Animation for when the element scrolls into view */
.text-highlight-animate {
  background-size: 0% 40%;
  animation: drawHighlight 0.6s ease-out forwards;
}

@keyframes drawHighlight {
  to {
    background-size: 100% 40%;
  }
}
```

## 5. Spacing and Layout Structure

- **The 8pt System:** Base all spacing (padding, margin, gap) on multiples of 4px or 8px (e.g., 8px, 16px, 24px, 32px).
- **Alignment:** Keep text left-aligned for maximum readability. Avoid center alignment for paragraphs.
- **Containers:** Limit text line length to 65-75 characters for readability.

## 6. Depth, Borders, and Interactive States

- **Clean Edges:** Avoid heavy borders. Use very subtle, light gray borders (1px solid #E2E8F0) to separate sections.
- **Border Radius:** Use 6px or 8px on buttons and inputs; 12px or 16px on main layout panels/cards.
- **Shadows:** Use soft, highly diffused drop shadows with low opacity for floating elements (dropdowns, modals) rather than harsh, dark shadows.
- **Transitions:** Apply a fast, smooth transition (`transition: all 0.2s ease-in-out`) to all clickable elements so hover states (background color shifts, darker borders) do not feel abrupt.
