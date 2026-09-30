# Implementation Plan: Responsive Web Design

## Overview

Transform OmniScan's user-facing application into a fully responsive web experience using a mobile-first approach. The implementation leverages Vue 3, TypeScript, and Ionic Framework, introducing a systematic responsive layout system that adapts seamlessly across mobile (320px+), tablet (768px+), and desktop (1024px+) viewports.

This plan focuses on creating the foundation layer (breakpoints, containers), implementing responsive navigation, updating all user-facing pages, ensuring accessibility compliance, and optimizing performance.

## Tasks

- [x] 1. Foundation Layer Setup
  - [x] 1.1 Configure viewport meta tags and breakpoint system
    - Update `omniscan-ui/index.html` with viewport meta tags (width=device-width, initial-scale=1.0, viewport-fit=cover)
    - Add color-scheme meta tag for dark mode support
    - Create `omniscan-ui/src/theme/breakpoints.css` with CSS custom properties for breakpoints (320px, 768px, 1024px, 1280px)
    - Define spacing scale variables that adapt to viewport size
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 1.2 Create useBreakpoint composable
    - Implement `omniscan-ui/src/utils/useBreakpoint.ts` with TypeScript
    - Export Breakpoint type ('mobile' | 'tablet' | 'desktop')
    - Implement reactive breakpoint detection using window resize listener
    - Provide computed properties: isMobile, isTablet, isDesktop
    - Clean up event listeners on component unmount
    - _Requirements: 2.5_
  
  - [ ]* 1.3 Write property test for useBreakpoint composable
    - **Property: Breakpoint detection accuracy**
    - **Validates: Requirements 2.1, 2.2, 2.3**
    - Test that breakpoint correctly identifies viewport ranges
    - Verify resize listener updates breakpoint value
  
  - [x] 1.4 Create content container and layout system
    - Create `omniscan-ui/src/theme/layout.css` with content-container class
    - Implement responsive padding (16px mobile, 20px tablet, 24px desktop)
    - Set max-width constraint (1280px for wide screens)
    - Apply horizontal centering with auto margins
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 1.5 Implement responsive grid system
    - Create `omniscan-ui/src/theme/grid.css` with CSS Grid utilities
    - Define responsive-grid class with adaptive column counts
    - Create grid variants: grid-auto-fill, grid-auto-fit, grid-equal-height
    - Configure gap spacing that scales with viewport
    - _Requirements: 7.2, 7.3, 7.4_
  
  - [ ]* 1.6 Write unit tests for grid layout classes
    - Test grid column counts at different viewport widths
    - Verify gap spacing values
    - Test grid-equal-height maintains consistent row heights

- [ ] 2. Checkpoint - Verify foundation layer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Typography and Asset Systems
  - [x] 3.1 Implement responsive typography system
    - Create `omniscan-ui/src/theme/typography.css`
    - Define CSS custom properties for font sizes (mobile scale)
    - Implement tablet and desktop scales (10-15% larger headings)
    - Set base font-size: 16px for body text
    - Configure line-height values (1.2 tight, 1.5 normal, 1.6 relaxed)
    - Apply minimum 16px font-size to all input fields (prevent iOS zoom)
    - Create long-form-content class with max-width: 75ch
    - _Requirements: 9.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
  
  - [ ]* 3.2 Write property test for typography scaling
    - **Property: Font size scales correctly across viewports**
    - **Validates: Requirements 12.2, 12.3**
    - Verify heading sizes increase by 10-20% from mobile to tablet/desktop
    - Test that base body text remains 16px across all viewports
  
  - [ ]* 3.3 Write property test for input field font size
    - **Property: Input field minimum font size**
    - **Validates: Requirements 9.4**
    - For any input field, computed font-size must be at least 16px
  
  - [ ] 3.4 Create responsive image utilities
    - Create `omniscan-ui/src/theme/images.css` with base image styles
    - Implement image-cover and image-contain classes
    - Define aspect ratio utility classes (aspect-16-9, aspect-4-3, aspect-1-1)
    - Set default img styles: max-width 100%, height auto
    - _Requirements: 13.1, 13.2, 13.3, 8.5_
  
  - [ ] 3.5 Implement ResponsiveImage component
    - Create `omniscan-ui/src/components/ResponsiveImage.vue`
    - Use <picture> element with multiple <source> elements for different viewports
    - Accept props: src, alt, width, height, srcset, objectFit
    - Add loading="lazy" attribute for lazy loading
    - Apply appropriate image-cover or image-contain class based on prop
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 17.3_
  
  - [ ]* 3.6 Write property test for image aspect ratio preservation
    - **Property: Images maintain aspect ratio**
    - **Validates: Requirements 13.1**
    - Verify max-width: 100% and height: auto are applied
    - Test that images scale proportionally within containers
  
  - [ ]* 3.7 Write property test for lazy loading
    - **Property: Image lazy loading**
    - **Validates: Requirements 17.3**
    - For any image element, loading attribute must be "lazy"

- [ ] 4. Touch Target and Accessibility
  - [x] 4.1 Implement touch target standards
    - Create `omniscan-ui/src/theme/accessibility.css`
    - Define touch-target class with min-width: 44px, min-height: 44px
    - Set minimum 8px spacing between adjacent touch targets
    - Configure ion-button sizing to meet minimum dimensions
    - Style text links with adequate tap area (padding/line-height)
    - Set form inputs to minimum height 44px
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 9.3_
  
  - [ ] 4.2 Implement keyboard focus states
    - Add focus-visible styles with 2px outline and offset
    - Remove outline for mouse users (keep for keyboard)
    - Ensure focus indicators work in both light and dark modes
    - _Requirements: 11.1_
  
  - [ ]* 4.3 Write property test for touch target dimensions
    - **Property 1: Touch target minimum dimensions**
    - **Validates: Requirements 5.7, 11.1, 11.2**
    - For any interactive element at any viewport, dimensions must be at least 44px × 44px
  
  - [ ]* 4.4 Write property test for touch target spacing
    - **Property 2: Adjacent touch target spacing**
    - **Validates: Requirements 11.3**
    - For any two adjacent interactive elements, spacing must be at least 8px
  
  - [ ]* 4.5 Write property test for input field height
    - **Property 4: Input field minimum height**
    - **Validates: Requirements 9.3**
    - For any input field at any viewport, minimum height must be at least 44px
  
  - [ ]* 4.6 Write property test for form field spacing
    - **Property 5: Form field spacing**
    - **Validates: Requirements 9.6**
    - For any two consecutive form fields, spacing must be at least 12px

- [ ] 5. Navigation System Implementation
  - [ ] 5.1 Create DesktopNav component
    - Create `omniscan-ui/src/components/DesktopNav.vue`
    - Implement fixed sidebar (260px width) with logo and navigation items
    - Use router-link with active-class highlighting
    - Display icons and labels for all nav items (Home, Scan, Pantry, Recipes)
    - Ensure 44px minimum height for nav items (touch target)
    - Apply hover states and active state styling
    - Make sidebar scrollable with overflow-y: auto
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ] 5.2 Update App.vue for adaptive navigation
    - Update `omniscan-ui/src/App.vue` to conditionally render navigation
    - Import and use useBreakpoint composable
    - Show DesktopNav when isDesktop is true (>= 1024px)
    - Show ion-tabs with bottom tab bar when isDesktop is false
    - Add with-desktop-nav class to ion-router-outlet for layout offset (260px margin-left)
    - Configure ion-tab-bar with slot="bottom" and navigation items
    - _Requirements: 5.1, 5.2, 5.3, 5.6_
  
  - [ ]* 5.3 Write integration test for navigation adaptation
    - Test that bottom tabs display below 1024px
    - Test that sidebar navigation displays at 1024px and above
    - Verify navigation items are accessible and clickable at all viewports

- [ ] 6. Checkpoint - Verify navigation and foundation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. HomePage Responsive Implementation
  - [ ] 7.1 Implement responsive stat cards
    - Update `omniscan-ui/src/views/HomePage.vue` stat cards section
    - Create stats-row with CSS Grid display
    - Mobile (<768px): 2 equal columns (1fr 1fr)
    - Tablet (768-1023px): 2 columns with 16px gap
    - Desktop (>=1024px): 4 columns with 20px gap
    - Style stat-card with proper padding, border-radius, hover effects
    - Ensure 44px minimum height for touch targets
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 7.2 Write property test for stat cards grid
    - Test that stat cards display in correct column count per viewport
    - Verify touch target dimensions meet 44px minimum
  
  - [ ] 7.3 Implement responsive recipe grid
    - Update HomePage recipe section with recipe-grid class
    - Mobile (<768px): single column with 12px gap
    - Tablet (768-1023px): 2 columns with 16px gap
    - Desktop (>=1024px): 3 columns with 20px gap
    - _Requirements: 4.5, 4.6_
  
  - [ ] 7.4 Implement responsive greeting header
    - Create greeting-row with flexbox layout
    - Allow flex-wrap for narrow screens
    - Stack vertically on screens <480px
    - Ensure greeting-title uses responsive font sizes (24px mobile, 28px tablet, 32px desktop)
    - Style header-actions with bell button and avatar (both 44px min-width/height)
    - Handle long names with overflow-wrap: break-word
    - _Requirements: 4.7, 12.2, 12.3_
  
  - [ ]* 7.5 Write integration test for HomePage layout
    - Test stat cards, recipe grid, and greeting header at mobile, tablet, desktop viewports
    - Verify no horizontal scrolling occurs

- [ ] 8. ScanPage Responsive Implementation
  - [ ] 8.1 Implement responsive camera preview and controls
    - Update `omniscan-ui/src/views/ScanPage.vue`
    - Create scan-container with flex column layout
    - Set camera-preview with 4:3 aspect ratio
    - Mobile (<768px): camera at 100% width
    - Tablet/Desktop (>=768px): constrain camera to max-width 640px and center
    - Position scan button in bottom 20% of viewport on mobile (fixed position)
    - Desktop: use sticky position for scan button
    - Ensure scan button has minimum 48px height
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 8.2 Write property test for camera aspect ratio
    - **Property 6: Camera preview aspect ratio preservation**
    - **Validates: Requirements 6.1**
    - Camera preview must maintain 4:3 aspect ratio at any viewport width
  
  - [ ] 8.3 Update ScanResultCard component for responsive layout
    - Update `omniscan-ui/src/components/ScanResultCard.vue`
    - Mobile (<768px): vertical layout (single column)
    - Tablet/Desktop (>=768px): horizontal layout (120px image, 1fr info, auto actions)
    - Apply grid layout with appropriate gaps
    - Style card-actions with flex column (mobile) and flex row (desktop)
    - Use image-contain class for product images
    - _Requirements: 6.5, 16.1_
  
  - [ ]* 8.4 Write unit tests for ScanResultCard responsiveness
    - Test vertical layout on mobile viewports
    - Test horizontal layout on tablet/desktop viewports

- [ ] 9. PantryPage Responsive Implementation
  - [ ] 9.1 Implement responsive pantry filters and grid
    - Update `omniscan-ui/src/views/PantryPage.vue`
    - Style pantry-filters with flexbox, allow overflow-x scroll on mobile
    - Mobile (<480px): flex-wrap for filter buttons
    - Tablet/Desktop (>=768px): horizontal row without wrapping
    - Create pantry-grid with CSS Grid
    - Mobile (<768px): single column, 12px gap
    - Tablet (768-1023px): 2 columns, 16px gap
    - Desktop (>=1024px): 3 columns, 20px gap
    - Set grid-auto-rows: 1fr for equal height cards
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 9.2 Write property test for pantry grid equal heights
    - **Property 7: Pantry grid equal card heights**
    - **Validates: Requirements 7.4**
    - All cards within a grid row must have equal height using CSS Grid auto-rows

- [ ] 10. RecipeSuggestionsPage Responsive Implementation
  - [ ] 10.1 Implement responsive recipe controls and grid
    - Update `omniscan-ui/src/views/RecipeSuggestionsPage.vue`
    - Style recipe-controls with flexbox
    - Mobile (<768px): stack controls vertically, full width
    - Tablet/Desktop (>=768px): horizontal row, space-between alignment
    - Constrain filter-group to max-width 300px on larger screens
    - Create recipe-grid with CSS Grid
    - Mobile (<768px): single column, 12px gap
    - Tablet (768-1023px): 2 columns, 16px gap
    - Desktop (>=1024px): 3 columns, 20px gap
    - _Requirements: 8.1, 8.2, 8.3, 8.6_
  
  - [ ]* 10.2 Write property test for recipe card images
    - **Property 8: Recipe card image aspect ratio**
    - **Validates: Requirements 8.5**
    - Recipe images must maintain 16:9 aspect ratio regardless of original dimensions
  
  - [ ] 10.3 Implement RecipeDetailModal with adaptive presentation
    - Update `omniscan-ui/src/components/RecipeDetailModal.vue`
    - Use useBreakpoint composable to determine modal class
    - Mobile: fullscreen modal (width 100%, height 100%, border-radius 0)
    - Tablet/Desktop: centered card (width 90%, max-width 800px, max-height 90vh, border-radius 12px)
    - Style recipe-hero-image with 16:9 aspect ratio
    - Apply responsive padding to recipe-body (16px mobile, 24px desktop)
    - Enable internal scrolling for long content
    - _Requirements: 8.4, 14.1, 14.2, 14.4_
  
  - [ ]* 10.4 Write property test for modal internal scrolling
    - **Property 14: Modal internal scrolling with fixed header/footer**
    - **Validates: Requirements 14.4**
    - Modal with content exceeding viewport height must enable internal scrolling while keeping header/footer visible
  
  - [ ]* 10.5 Write property test for modal backdrop
    - **Property 15: Modal backdrop presence**
    - **Validates: Requirements 14.5**
    - Any modal dialog must render semi-transparent backdrop overlay

- [ ] 11. Checkpoint - Verify core pages
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. ProfilePage and SettingsPage Responsive Implementation
  - [ ] 12.1 Implement responsive ProfilePage layout
    - Update `omniscan-ui/src/views/ProfilePage.vue`
    - Create profile-header with CSS Grid
    - Mobile (<768px): single column, center-aligned
    - Tablet/Desktop (>=768px): two columns (auto 1fr), left-aligned
    - Style avatar-large (120px × 120px, border-radius 50%)
    - Position avatar-section with flex column and center alignment on mobile
    - Apply responsive button widths (expand block on mobile, auto on desktop)
    - _Requirements: 10.1, 10.2_
  
  - [ ] 12.2 Implement responsive SettingsPage layout
    - Update `omniscan-ui/src/views/SettingsPage.vue`
    - Create settings-container with max-width 800px, centered
    - Apply responsive padding using --container-padding variable
    - Mobile (<768px): fix settings-actions to bottom with border-top
    - Desktop (>=768px): display settings-actions inline (static position)
    - Ensure ion-list has proper spacing
    - _Requirements: 10.3, 10.4, 10.5_
  
  - [ ]* 12.3 Write integration test for profile and settings pages
    - Test ProfilePage layout at mobile and tablet/desktop viewports
    - Test SettingsPage action button positioning

- [ ] 13. NotificationsPage Responsive Implementation
  - [ ] 13.1 Implement responsive notifications layout
    - Update `omniscan-ui/src/views/NotificationsPage.vue`
    - Create notifications-container with responsive padding
    - Style notifications-list with flex column
    - Set 12px gap between notification cards
    - Mobile: max-width 100%
    - Tablet/Desktop (>=768px): max-width 800px, centered with auto margins, 16px gap
    - _Requirements: 15.1, 15.2, 15.3_
  
  - [ ]* 13.2 Write property test for notification card spacing
    - **Property 16: Notification cards adequate spacing**
    - **Validates: Requirements 15.3**
    - Two consecutive notification cards must have at least 8px spacing for touch interaction

- [ ] 14. PhotoPantryUploadModal Responsive Implementation
  - [ ] 14.1 Implement responsive photo grid in upload modal
    - Update `omniscan-ui/src/components/PhotoPantryUploadModal.vue`
    - Create photo-grid with CSS Grid
    - Mobile (<768px): 2 columns, 12px gap
    - Tablet (768-1023px): 3 columns, 16px gap
    - Desktop (>=1024px): 4 columns, 16px gap
    - Style photo-preview with aspect-ratio: 1, border-radius: 8px
    - Position remove-btn absolutely (top-right corner)
    - Style add-photo-btn with dashed border, min-height 44px
    - Apply object-fit: cover to photo images
    - _Requirements: 16.3_
  
  - [ ]* 14.2 Write property test for grid product images
    - **Property 10: Grid product images use object-fit cover**
    - **Validates: Requirements 13.2**
    - Product images in grid layouts must use object-fit: cover

- [ ] 15. Form Layout Responsiveness
  - [ ] 15.1 Implement responsive form system
    - Create `omniscan-ui/src/theme/forms.css`
    - Define form-group with 20px bottom margin
    - Create form-row with CSS Grid, single column by default
    - Tablet/Desktop (>=768px): form-row--two-col (2 columns), form-row--three-col (3 columns)
    - Style form-field with flex column, 8px gap
    - Implement form-field--inline for tablet/desktop (flex row, label min-width 150px)
    - Set form-field + form-field margin-top: 12px
    - _Requirements: 9.1, 9.2, 9.5, 9.6_
  
  - [ ]* 15.2 Write integration test for form layouts
    - Test single-column layout on mobile
    - Test multi-column layout on tablet/desktop
    - Verify form field spacing meets 12px minimum

- [ ] 16. Dark Mode and Theme Support
  - [ ] 16.1 Implement dark mode responsive adjustments
    - Update theme files to ensure borders are visible in dark mode
    - Set --ion-border-color with proper opacity for light/dark modes
    - Adjust box-shadow values for dark mode (higher opacity)
    - Ensure spacing, padding, layout rules are identical across themes
    - Verify contrast ratios meet WCAG AA standards (4.5:1 normal, 3:1 large text)
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [ ]* 16.2 Write property test for layout consistency across themes
    - **Property 20: Layout consistency across themes**
    - **Validates: Requirements 18.1**
    - Computed spacing, padding, and layout metrics must be identical in light and dark modes
  
  - [ ]* 16.3 Write property test for dark mode text contrast
    - **Property 21: Dark mode text contrast ratio**
    - **Validates: Requirements 18.2**
    - Text elements in dark mode must have at least 4.5:1 contrast ratio (3:1 for large text)
  
  - [ ]* 16.4 Write property test for dark mode border visibility
    - **Property 22: Dark mode border visibility**
    - **Validates: Requirements 18.3**
    - Borders must have sufficient contrast in dark mode
  
  - [ ]* 16.5 Write property test for dark mode shadow visibility
    - **Property 23: Dark mode shadow visibility**
    - **Validates: Requirements 18.4**
    - Box shadows must be adjusted for visibility in dark mode

- [ ] 17. Performance Optimization
  - [ ] 17.1 Optimize CSS delivery and minification
    - Update `omniscan-ui/vite.config.ts` for optimal CSS bundling
    - Set cssCodeSplit: false for single CSS bundle
    - Enable minification with terser
    - Configure SCSS preprocessor to import variables globally
    - _Requirements: 17.2, 17.4_
  
  - [ ] 17.2 Implement lazy loading for images
    - Audit all image elements across the application
    - Add loading="lazy" attribute to img tags
    - Update ResponsiveImage component to include lazy loading by default
    - Verify off-screen images are deferred
    - _Requirements: 17.3_
  
  - [ ] 17.3 Minimize layout reflow and repaint
    - Review resize event handlers for performance issues
    - Use CSS-based responsive techniques instead of JavaScript where possible
    - Apply will-change sparingly to animated elements
    - Test layout shift metrics during viewport resize
    - _Requirements: 17.1, 17.2_
  
  - [ ]* 17.4 Write property test for horizontal scrolling prevention
    - **Property 24: No horizontal scrolling at standard viewports**
    - **Validates: Requirements 19.4**
    - At standard viewport widths (320px, 768px, 1024px, 1280px), document.body.scrollWidth must equal window.innerWidth

- [ ] 18. Checkpoint - Performance and optimization verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Testing and Quality Assurance
  - [ ] 19.1 Write Cypress responsive layout tests
    - Create Cypress test suite for HomePage at mobile, tablet, desktop viewports
    - Test ScanPage camera preview and button positioning
    - Test PantryPage grid column counts
    - Test RecipeSuggestionsPage grid and modal presentation
    - Test navigation adaptation (bottom tabs vs sidebar)
    - Verify no horizontal scrolling at standard widths (320px, 768px, 1024px, 1280px)
    - _Requirements: 19.1, 19.3, 19.4_
  
  - [ ]* 19.2 Write property test for body text line height
    - **Property 25: Body text line height**
    - **Validates: Requirements 12.5**
    - Body text line-height must be between 1.4 and 1.6
  
  - [ ] 19.3 Create accessibility audit checklist
    - Document touch target size validation approach using browser dev tools
    - Create checklist for WCAG AA contrast ratio verification
    - Define keyboard navigation testing procedure
    - List physical device testing requirements (iOS and Android)
    - _Requirements: 19.2, 19.5_
  
  - [ ] 19.4 Perform device testing and validation
    - Test on physical iOS device (iPhone)
    - Test on physical Android device
    - Verify touch targets are easily tappable
    - Confirm viewport zoom functionality remains available
    - Test camera preview and scan functionality on actual devices
    - Validate form inputs do not trigger unwanted zoom on iOS
    - _Requirements: 19.5, 19.6, 9.4_

- [ ] 20. Documentation and Graceful Degradation
  - [ ] 20.1 Implement graceful degradation patterns
    - Add CSS Grid fallbacks using Flexbox
    - Use @supports queries for progressive enhancement
    - Provide CSS custom property fallbacks with default values
    - Ensure core navigation remains accessible without modern CSS
    - Test form functionality without CSS Grid support
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [ ] 20.2 Document browser support and responsive guidelines
    - Document minimum browser versions (Chrome/Edge 90+, Safari 14+, Firefox 88+)
    - Create developer guide for implementing responsive components
    - Document breakpoint system usage patterns
    - Provide examples of mobile-first CSS patterns
    - Document performance best practices

- [ ] 21. Final Checkpoint - Complete implementation verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements from the requirements document for traceability
- The implementation uses TypeScript and Vue 3 Composition API throughout
- All responsive layouts use mobile-first approach with min-width media queries
- Touch targets must meet 44px × 44px minimum for accessibility
- Property tests validate universal correctness properties from the design document
- Unit tests and integration tests validate specific implementations and workflows
- Checkpoints ensure incremental validation and allow for user feedback
- Performance optimization focuses on CSS-based solutions over JavaScript
- Dark mode support is built into all responsive layouts
- Physical device testing is critical for validating touch interactions and viewport behavior

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["1.2", "1.4", "3.4", "4.2", "15.1"] },
    { "id": 2, "tasks": ["1.3", "1.5", "3.2", "3.5", "4.3", "17.1"] },
    { "id": 3, "tasks": ["1.6", "3.3", "3.6", "4.4", "5.1", "16.1"] },
    { "id": 4, "tasks": ["3.7", "4.5", "4.6", "5.2", "17.2"] },
    { "id": 5, "tasks": ["5.3", "7.1", "15.2", "16.2", "17.3"] },
    { "id": 6, "tasks": ["7.2", "7.3", "8.1", "16.3", "17.4"] },
    { "id": 7, "tasks": ["7.4", "8.2", "8.3", "16.4"] },
    { "id": 8, "tasks": ["7.5", "8.4", "9.1", "16.5"] },
    { "id": 9, "tasks": ["9.2", "10.1", "19.1"] },
    { "id": 10, "tasks": ["10.2", "10.3", "19.2"] },
    { "id": 11, "tasks": ["10.4", "10.5", "12.1"] },
    { "id": 12, "tasks": ["12.2", "13.1"] },
    { "id": 13, "tasks": ["12.3", "13.2", "14.1"] },
    { "id": 14, "tasks": ["14.2", "19.3"] },
    { "id": 15, "tasks": ["19.4", "20.1"] },
    { "id": 16, "tasks": ["20.2"] }
  ]
}
```
