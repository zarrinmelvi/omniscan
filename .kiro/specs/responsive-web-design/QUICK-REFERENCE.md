# Quick Reference: Responsive Web Design System

## CSS Classes Reference

### Layout
\\\css
.content-container          /* Max-width 1280px, responsive padding */
.responsive-grid            /* 1 → 2 → 3 column grid */
.grid-auto-fill            /* Auto-fill with 280px min columns */
.grid-auto-fit             /* Auto-fit with 280px min columns */
.grid-equal-height         /* Equal height cards in rows */
\\\

### Images
\\\css
.image-cover               /* object-fit: cover for grids */
.image-contain             /* object-fit: contain for details */
.aspect-16-9               /* 16:9 aspect ratio */
.aspect-4-3                /* 4:3 aspect ratio */
.aspect-1-1                /* 1:1 square aspect ratio */
\\\

### Typography
\\\css
.long-form-content         /* Max 75ch line length */
.text-small                /* 14px font size */
.text-tiny                 /* 12px font size */
\\\

### Accessibility
\\\css
.touch-target              /* Min 44×44px touch area */
\\\

## Breakpoints

\\\css
/* Mobile (default) */
@media (max-width: 767px) { ... }

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) { ... }

/* Desktop */
@media (min-width: 1024px) { ... }

/* Wide */
@media (min-width: 1280px) { ... }
\\\

## Vue Composable

\\\	ypescript
import { useBreakpoint } from '@/utils/useBreakpoint'

const { breakpoint, width, isMobile, isTablet, isDesktop } = useBreakpoint()
\\\

## Component Usage

### ResponsiveImage
\\\ue
<ResponsiveImage 
  src="/image.jpg"
  alt="Description"
  :width="800"
  :height="600"
  object-fit="cover"
/>
\\\

### Content Container
\\\ue
<ion-content>
  <div class="content-container">
    <!-- Page content -->
  </div>
</ion-content>
\\\

### Responsive Grid
\\\ue
<div class="responsive-grid">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
\\\

## CSS Custom Properties

\\\css
/* Breakpoints */
--breakpoint-mobile: 320px
--breakpoint-tablet: 768px
--breakpoint-desktop: 1024px
--breakpoint-wide: 1280px

/* Spacing */
--spacing-base: 16px → 20px → 24px
--container-padding: 16px → 20px → 24px
--grid-gap: 12px → 16px → 20px

/* Typography */
--font-size-h1: 28px → 32px → 36px
--font-size-body: 16px (all viewports)
--line-height-tight: 1.2
--line-height-normal: 1.5
--line-height-relaxed: 1.6
\\\

## Common Patterns

### Responsive Card Grid
\\\ue
<style scoped>
.card-grid {
  display: grid;
  gap: 12px;
}

@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}
</style>
\\\

### Touch-Friendly Button
\\\ue
<button class="touch-target">
  Click Me
</button>

<style scoped>
button {
  min-height: 44px;
  padding: 12px 24px;
}
</style>
\\\

### Conditional Desktop Layout
\\\ue
<script setup>
import { useBreakpoint } from '@/utils/useBreakpoint'
const { isDesktop } = useBreakpoint()
</script>

<template>
  <div v-if="isDesktop" class="desktop-layout">
    <!-- Desktop view -->
  </div>
  <div v-else class="mobile-layout">
    <!-- Mobile/tablet view -->
  </div>
</template>
\\\

---

*Quick Reference for OmniScan Responsive Design System*
