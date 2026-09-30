# Design Document: Responsive Web Design

## Introduction

This document defines the technical design for transforming OmniScan's user-facing application into a fully responsive web experience. The implementation will adopt a mobile-first approach, leveraging Ionic Framework's existing component system while enhancing it with modern CSS responsive patterns.

The design builds upon OmniScan's existing Vue 3 + TypeScript + Ionic architecture, introducing a systematic responsive layout system that adapts seamlessly across mobile (320px+), tablet (768px+), and desktop (1024px+) viewports.

## Architecture Overview

### System Components

The responsive transformation consists of five interconnected layers:

1. **Foundation Layer**: Viewport configuration, breakpoint system, and CSS custom properties
2. **Layout Layer**: Content containers, grid systems, and spacing utilities
3. **Component Layer**: Responsive Vue components with adaptive layouts
4. **Typography Layer**: Scalable type system with viewport-aware sizing
5. **Asset Layer**: Responsive images and media with optimized loading

### Technology Stack

- **Framework**: Vue 3.3+ with Composition API
- **UI Library**: Ionic Framework 8.0+
- **Styling**: CSS3 with CSS Grid, Flexbox, and Custom Properties
- **Build Tool**: Vite 5.0+
- **Type Safety**: TypeScript 5.9+

## Foundation Layer

### Viewport Configuration

**Implementation Location**: `omniscan-ui/index.html`

The viewport meta tag will be configured in the document head:

```html
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
>
<meta name="color-scheme" content="light dark">
```

**Key Decisions**:
- `width=device-width` ensures proper scaling on all devices
- `initial-scale=1.0` sets 1:1 pixel ratio at load
- `viewport-fit=cover` provides safe area support for notched devices
- User scaling is NOT disabled (no `maximum-scale` or `user-scalable=no`)
- Color scheme meta tag enables OS-level dark mode integration

### Breakpoint System

**Implementation Location**: `omniscan-ui/src/theme/breakpoints.css`

Define breakpoints as CSS custom properties for consistency across the application:

```css
:root {
  /* Breakpoint values */
  --breakpoint-mobile: 320px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1280px;
  
  /* Breakpoint-based spacing scale */
  --spacing-base: 16px;
  --spacing-tablet: 20px;
  --spacing-desktop: 24px;
}
```

**Media Query Pattern** (mobile-first approach):

```css
/* Mobile: base styles, no media query needed */
.element {
  /* mobile styles */
}

/* Tablet: 768px and above */
@media (min-width: 768px) {
  .element {
    /* tablet styles */
  }
}

/* Desktop: 1024px and above */
@media (min-width: 1024px) {
  .element {
    /* desktop styles */
  }
}
```

**TypeScript Composable** for JavaScript-based breakpoint detection:

**Implementation Location**: `omniscan-ui/src/utils/useBreakpoint.ts`

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint() {
  const breakpoint = ref<Breakpoint>('mobile');
  const width = ref(window.innerWidth);

  const updateBreakpoint = () => {
    width.value = window.innerWidth;
    
    if (width.value >= 1024) {
      breakpoint.value = 'desktop';
    } else if (width.value >= 768) {
      breakpoint.value = 'tablet';
    } else {
      breakpoint.value = 'mobile';
    }
  };

  onMounted(() => {
    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', updateBreakpoint);
  });

  return {
    breakpoint,
    width,
    isMobile: computed(() => breakpoint.value === 'mobile'),
    isTablet: computed(() => breakpoint.value === 'tablet'),
    isDesktop: computed(() => breakpoint.value === 'desktop'),
  };
}
```

**Usage Note**: Prefer CSS media queries over JavaScript detection. Use this composable only when conditional logic or different components are required based on viewport.

## Layout Layer

### Content Container System

**Implementation Location**: `omniscan-ui/src/theme/layout.css`

```css
.content-container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: var(--container-padding);
  padding-right: var(--container-padding);
  max-width: var(--container-max-width);
}

:root {
  /* Mobile: < 768px */
  --container-padding: 16px;
  --container-max-width: 100%;
}

@media (min-width: 768px) {
  :root {
    /* Tablet: 768px - 1024px */
    --container-padding: 20px;
  }
}

@media (min-width: 1024px) {
  :root {
    /* Desktop: 1024px - 1280px */
    --container-padding: 24px;
  }
}

@media (min-width: 1280px) {
  :root {
    /* Wide: 1280px+ */
    --container-max-width: 1280px;
  }
}
```

**Integration with Ionic**:

Ionic's `<ion-content>` will wrap pages. Apply the content container class to a div inside ion-content:

```vue
<template>
  <ion-page>
    <ion-content>
      <div class="content-container">
        <!-- Page content -->
      </div>
    </ion-content>
  </ion-page>
</template>
```

### Responsive Grid System

**Hybrid Approach**: Combine Ionic Grid for simple layouts with CSS Grid for complex responsive patterns.

**Implementation Location**: `omniscan-ui/src/theme/grid.css`

```css
/* CSS Grid-based responsive grid */
.responsive-grid {
  display: grid;
  gap: var(--grid-gap);
  grid-template-columns: repeat(var(--grid-columns), 1fr);
}

:root {
  /* Mobile: single column */
  --grid-columns: 1;
  --grid-gap: 12px;
}

@media (min-width: 768px) {
  :root {
    /* Tablet: 2 columns */
    --grid-columns: 2;
    --grid-gap: 16px;
  }
}

@media (min-width: 1024px) {
  :root {
    /* Desktop: 3 columns */
    --grid-columns: 3;
    --grid-gap: 20px;
  }
}

/* Grid variants for specific layouts */
.grid-auto-fill {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.grid-auto-fit {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

/* Maintain consistent card heights in rows */
.grid-equal-height {
  grid-auto-rows: 1fr;
}
```

**Ionic Grid Usage** (for simpler two-column layouts):

```vue
<ion-grid>
  <ion-row>
    <ion-col size="12" size-md="6" size-lg="4">
      <!-- Content -->
    </ion-col>
  </ion-row>
</ion-grid>
```

## Component Layer

### Navigation System

**Implementation Strategy**: Use Ionic's `<ion-tabs>` for mobile and create a custom sidebar/header navigation for desktop.

**Implementation Location**: `omniscan-ui/src/App.vue` and `omniscan-ui/src/components/DesktopNav.vue`

**App.vue Structure**:

```vue
<template>
  <ion-app>
    <!-- Desktop navigation (>= 1024px) -->
    <DesktopNav v-if="isDesktop" />
    
    <!-- Main content area -->
    <ion-router-outlet :class="{ 'with-desktop-nav': isDesktop }" />
    
    <!-- Mobile tab bar (< 1024px) -->
    <ion-tabs v-if="!isDesktop">
      <ion-router-outlet></ion-router-outlet>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="scan" href="/scan">
          <ion-icon :icon="scanOutline" />
          <ion-label>Scan</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="pantry" href="/pantry">
          <ion-icon :icon="cubeOutline" />
          <ion-label>Pantry</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="recipes" href="/recipes">
          <ion-icon :icon="restaurantOutline" />
          <ion-label>Recipes</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-app>
</template>

<script setup lang="ts">
import { useBreakpoint } from '@/utils/useBreakpoint';

const { isDesktop } = useBreakpoint();
</script>

<style scoped>
.with-desktop-nav {
  margin-left: 260px; /* Width of desktop sidebar */
}

@media (max-width: 1023px) {
  .with-desktop-nav {
    margin-left: 0;
  }
}
</style>
```

**DesktopNav.vue** (Sidebar Navigation):

```vue
<template>
  <nav class="desktop-nav">
    <div class="nav-header">
      <img src="/logo.svg" alt="OmniScan" class="nav-logo" />
      <h2 class="nav-title">OmniScan</h2>
    </div>
    
    <ul class="nav-menu">
      <li v-for="item in navItems" :key="item.path">
        <router-link 
          :to="item.path" 
          class="nav-item"
          active-class="nav-item--active"
        >
          <ion-icon :icon="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { homeOutline, scanOutline, cubeOutline, restaurantOutline } from 'ionicons/icons';

const navItems = [
  { path: '/home', label: 'Home', icon: homeOutline },
  { path: '/scan', label: 'Scan', icon: scanOutline },
  { path: '/pantry', label: 'Pantry', icon: cubeOutline },
  { path: '/recipes', label: 'Recipes', icon: restaurantOutline },
];
</script>

<style scoped>
.desktop-nav {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 260px;
  background: var(--ion-background-color);
  border-right: 1px solid var(--ion-border-color);
  padding: 24px 0;
  overflow-y: auto;
  z-index: 1000;
}

.nav-header {
  padding: 0 24px 24px;
  border-bottom: 1px solid var(--ion-border-color);
}

.nav-logo {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

.nav-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.nav-menu {
  list-style: none;
  padding: 16px 0;
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  color: var(--ion-text-color);
  text-decoration: none;
  transition: background 0.2s;
  min-height: 44px; /* Touch target size */
}

.nav-item:hover {
  background: var(--ion-color-light);
}

.nav-item--active {
  background: var(--ion-color-primary-tint);
  color: var(--ion-color-primary);
  font-weight: 600;
}

.nav-item ion-icon {
  font-size: 24px;
}
</style>
```

### Page-Specific Responsive Layouts

#### HomePage

**Implementation Location**: `omniscan-ui/src/views/HomePage.vue`

**Responsive Stat Cards**:

```vue
<template>
  <div class="stats-row">
    <button 
      v-for="stat in stats" 
      :key="stat.label"
      type="button" 
      class="stat-card" 
      @click="stat.onClick"
    >
      <span class="stat-label">{{ stat.label }}</span>
      <span class="stat-value">{{ stat.value }}</span>
      <span :class="['stat-bar', `stat-bar--${stat.color}`]"></span>
    </button>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  gap: 12px;
  margin-bottom: 24px;
}

/* Mobile: 2 equal columns */
@media (max-width: 767px) {
  .stats-row {
    grid-template-columns: 1fr 1fr;
  }
}

/* Tablet: 2 columns */
@media (min-width: 768px) and (max-width: 1023px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

/* Desktop: 4 columns */
@media (min-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
}

.stat-card {
  background: var(--ion-card-background);
  border: 1px solid var(--ion-border-color);
  border-radius: 12px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s;
  min-height: 44px; /* Touch target */
}

.stat-card:hover {
  transform: translateY(-2px);
}
</style>
```

**Responsive Recipe Grid**:

```vue
<template>
  <div class="recipe-grid">
    <RecipeCard 
      v-for="recipe in recipes" 
      :key="recipe.id"
      :recipe="recipe"
    />
  </div>
</template>

<style scoped>
.recipe-grid {
  display: grid;
  gap: 16px;
}

/* Mobile: single column */
@media (max-width: 767px) {
  .recipe-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Tablet: 2 columns */
@media (min-width: 768px) and (max-width: 1023px) {
  .recipe-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop: 3 columns */
@media (min-width: 1024px) {
  .recipe-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}
</style>
```

**Responsive Greeting Header**:

```vue
<template>
  <div class="greeting-row">
    <div class="greeting-content">
      <h1 class="greeting-title">{{ greeting }}, {{ userName }}!</h1>
      <p class="greeting-date">{{ formattedDate }}</p>
    </div>
    <div class="header-actions">
      <button type="button" class="bell-btn" @click="goToNotifications" aria-label="Notifications">
        <ion-icon :icon="notificationsOutline" />
      </button>
      <button type="button" class="avatar-wrap" @click="goToProfile" aria-label="Go to profile">
        <img v-if="avatarBase64" :src="avatarBase64" alt="Profile photo" class="avatar-image" />
        <span v-else class="avatar-initial">{{ (userName || '?').charAt(0) }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.greeting-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap; /* Allow wrapping on narrow screens */
}

.greeting-content {
  flex: 1;
  min-width: 0; /* Prevent overflow */
}

.greeting-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 4px 0;
  overflow-wrap: break-word; /* Handle long names */
}

.greeting-date {
  margin: 0;
  color: var(--ion-color-medium);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.bell-btn,
.avatar-wrap {
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--ion-border-color);
  background: var(--ion-card-background);
  cursor: pointer;
}

/* Stack vertically when header wraps */
@media (max-width: 480px) {
  .greeting-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    justify-content: flex-end;
  }
}

@media (min-width: 768px) {
  .greeting-title {
    font-size: 28px;
  }
}

@media (min-width: 1024px) {
  .greeting-title {
    font-size: 32px;
  }
}
</style>
```

#### ScanPage

**Implementation Location**: `omniscan-ui/src/views/ScanPage.vue`

```vue
<template>
  <ion-page>
    <ion-content>
      <div class="scan-container">
        <div class="camera-wrapper">
          <div class="camera-preview" :style="{ aspectRatio: '4/3' }">
            <!-- Camera component -->
            <CameraPreview ref="cameraRef" />
          </div>
        </div>
        
        <div class="scan-controls">
          <ion-button 
            expand="block" 
            size="large"
            class="scan-button"
            @click="captureImage"
          >
            <ion-icon slot="start" :icon="cameraOutline" />
            Capture Product
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.scan-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: var(--container-padding);
}

.camera-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
}

.camera-preview {
  width: 100%;
  max-width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: var(--ion-color-dark);
}

/* Tablet and desktop: constrain camera width */
@media (min-width: 768px) {
  .camera-preview {
    max-width: 640px;
  }
}

.scan-controls {
  position: sticky;
  bottom: 0;
  padding: 16px 0;
  background: var(--ion-background-color);
}

/* Mobile: position button in thumb-reach zone */
@media (max-width: 767px) {
  .scan-controls {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: linear-gradient(to top, var(--ion-background-color) 80%, transparent);
  }
}

.scan-button {
  min-height: 48px;
}
</style>
```

#### PantryPage

**Implementation Location**: `omniscan-ui/src/views/PantryPage.vue`

```vue
<template>
  <ion-page>
    <ion-content>
      <div class="content-container">
        <div class="pantry-filters">
          <ion-button 
            v-for="filter in filters" 
            :key="filter.value"
            :fill="activeFilter === filter.value ? 'solid' : 'outline'"
            size="small"
            @click="setFilter(filter.value)"
          >
            {{ filter.label }}
          </ion-button>
        </div>
        
        <div class="pantry-grid">
          <PantryItemCard 
            v-for="item in filteredItems" 
            :key="item.id"
            :item="item"
          />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.pantry-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Mobile: vertical stack if needed */
@media (max-width: 480px) {
  .pantry-filters {
    flex-wrap: wrap;
  }
}

/* Tablet and desktop: horizontal row */
@media (min-width: 768px) {
  .pantry-filters {
    flex-wrap: nowrap;
  }
}

.pantry-grid {
  display: grid;
  gap: 16px;
  grid-auto-rows: 1fr; /* Equal height cards */
}

/* Mobile: single column */
@media (max-width: 767px) {
  .pantry-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Tablet: 2 columns */
@media (min-width: 768px) and (max-width: 1023px) {
  .pantry-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop: 3 columns */
@media (min-width: 1024px) {
  .pantry-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}
</style>
```

#### RecipeSuggestionsPage

**Implementation Location**: `omniscan-ui/src/views/RecipeSuggestionsPage.vue`

```vue
<template>
  <ion-page>
    <ion-content>
      <div class="content-container">
        <div class="recipe-controls">
          <div class="filter-group">
            <ion-select 
              v-model="selectedCategory" 
              placeholder="All Categories"
              interface="popover"
            >
              <ion-select-option 
                v-for="cat in categories" 
                :key="cat"
                :value="cat"
              >
                {{ cat }}
              </ion-select-option>
            </ion-select>
          </div>
          
          <div class="sort-group">
            <ion-button fill="outline" size="small">
              <ion-icon slot="start" :icon="swapVerticalOutline" />
              Sort
            </ion-button>
          </div>
        </div>
        
        <div class="recipe-grid">
          <RecipeCard 
            v-for="recipe in recipes" 
            :key="recipe.id"
            :recipe="recipe"
            @click="openRecipeDetail(recipe)"
          />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.recipe-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  align-items: center;
}

/* Mobile: stack controls */
@media (max-width: 767px) {
  .recipe-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group,
  .sort-group {
    width: 100%;
  }
}

/* Tablet and desktop: horizontal row */
@media (min-width: 768px) {
  .recipe-controls {
    flex-direction: row;
    justify-content: space-between;
  }
  
  .filter-group {
    flex: 1;
    max-width: 300px;
  }
}

.recipe-grid {
  display: grid;
  gap: 16px;
}

/* Mobile: single column */
@media (max-width: 767px) {
  .recipe-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Tablet: 2 columns */
@media (min-width: 768px) and (max-width: 1023px) {
  .recipe-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop: 3 columns */
@media (min-width: 1024px) {
  .recipe-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}
</style>
```

#### ProfilePage & SettingsPage

**Implementation Location**: `omniscan-ui/src/views/ProfilePage.vue`

```vue
<template>
  <ion-page>
    <ion-content>
      <div class="content-container">
        <div class="profile-header">
          <div class="avatar-section">
            <div class="avatar-large">
              <img v-if="avatarUrl" :src="avatarUrl" alt="Profile" />
              <span v-else class="avatar-initial">{{ userInitial }}</span>
            </div>
            <ion-button fill="outline" size="small">
              Change Photo
            </ion-button>
          </div>
          
          <div class="info-section">
            <h1 class="profile-name">{{ userName }}</h1>
            <p class="profile-email">{{ userEmail }}</p>
            <ion-button expand="block">
              Edit Profile
            </ion-button>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.profile-header {
  display: grid;
  gap: 24px;
  margin-bottom: 32px;
}

/* Mobile: single column */
@media (max-width: 767px) {
  .profile-header {
    grid-template-columns: 1fr;
    text-align: center;
  }
  
  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
}

/* Tablet and desktop: two columns */
@media (min-width: 768px) {
  .profile-header {
    grid-template-columns: auto 1fr;
    text-align: left;
  }
  
  .avatar-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .info-section {
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

.avatar-large {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--ion-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: 600;
  color: var(--ion-color-primary);
}

.avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
```

**SettingsPage**:

```vue
<template>
  <ion-page>
    <ion-content>
      <div class="settings-container">
        <ion-list class="settings-list">
          <ion-item-group>
            <ion-item-divider>
              <ion-label>Preferences</ion-label>
            </ion-item-divider>
            <ion-item>
              <ion-label>Dark Mode</ion-label>
              <ion-toggle v-model="darkMode" />
            </ion-item>
            <ion-item>
              <ion-label>Notifications</ion-label>
              <ion-toggle v-model="notifications" />
            </ion-item>
          </ion-item-group>
        </ion-list>
        
        <div class="settings-actions">
          <ion-button expand="block" color="danger">
            Sign Out
          </ion-button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--container-padding);
}

.settings-list {
  margin-bottom: 24px;
}

.settings-actions {
  position: relative;
}

/* Mobile: fixed action buttons at bottom */
@media (max-width: 767px) {
  .settings-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 16px;
    background: var(--ion-background-color);
    border-top: 1px solid var(--ion-border-color);
  }
}

/* Desktop: inline action buttons */
@media (min-width: 768px) {
  .settings-actions {
    position: static;
    padding: 0;
  }
}
</style>
```

#### NotificationsPage

**Implementation Location**: `omniscan-ui/src/views/NotificationsPage.vue`

```vue
<template>
  <ion-page>
    <ion-content>
      <div class="notifications-container">
        <div class="notifications-list">
          <NotificationCard 
            v-for="notification in notifications" 
            :key="notification.id"
            :notification="notification"
          />
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.notifications-container {
  padding: var(--container-padding);
}

.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 100%;
}

/* Tablet and desktop: constrain width and center */
@media (min-width: 768px) {
  .notifications-list {
    max-width: 800px;
    margin: 0 auto;
    gap: 16px;
  }
}
</style>
```

### Shared Component Responsiveness

#### ScanResultCard

**Implementation Location**: `omniscan-ui/src/components/ScanResultCard.vue`

```vue
<template>
  <div class="scan-result-card">
    <div class="product-image">
      <img :src="product.imageUrl" :alt="product.name" />
    </div>
    <div class="product-info">
      <h3 class="product-name">{{ product.name }}</h3>
      <p class="product-brand">{{ product.brand }}</p>
      <p class="product-category">{{ product.category }}</p>
    </div>
    <div class="card-actions">
      <ion-button size="small" fill="outline">
        View Details
      </ion-button>
      <ion-button size="small">
        Add to Pantry
      </ion-button>
    </div>
  </div>
</template>

<style scoped>
.scan-result-card {
  background: var(--ion-card-background);
  border: 1px solid var(--ion-border-color);
  border-radius: 12px;
  padding: 16px;
  display: grid;
  gap: 16px;
}

/* Mobile: vertical layout */
@media (max-width: 767px) {
  .scan-result-card {
    grid-template-columns: 1fr;
  }
  
  .product-image {
    width: 100%;
    aspect-ratio: 1;
  }
  
  .card-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

/* Tablet and desktop: horizontal layout */
@media (min-width: 768px) {
  .scan-result-card {
    grid-template-columns: 120px 1fr auto;
    align-items: center;
  }
  
  .product-image {
    width: 120px;
    height: 120px;
  }
  
  .card-actions {
    display: flex;
    gap: 8px;
    flex-direction: row;
  }
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}
</style>
```

#### RecipeDetailModal

**Implementation Location**: `omniscan-ui/src/components/RecipeDetailModal.vue`

```vue
<template>
  <ion-modal 
    :is-open="isOpen" 
    @didDismiss="$emit('close')"
    :breakpoints="[0, 1]"
    :initialBreakpoint="1"
    :class="modalClass"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ recipe.name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="closeOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content class="recipe-modal-content">
      <div class="recipe-detail">
        <img 
          :src="recipe.imageUrl" 
          :alt="recipe.name"
          class="recipe-hero-image"
        />
        
        <div class="recipe-body">
          <section class="ingredients-section">
            <h2>Ingredients</h2>
            <ul>
              <li v-for="(ingredient, idx) in recipe.ingredients" :key="idx">
                {{ ingredient }}
              </li>
            </ul>
          </section>
          
          <section class="instructions-section">
            <h2>Instructions</h2>
            <ol>
              <li v-for="(step, idx) in recipe.instructions" :key="idx">
                {{ step }}
              </li>
            </ol>
          </section>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBreakpoint } from '@/utils/useBreakpoint';

const { isMobile } = useBreakpoint();

const modalClass = computed(() => ({
  'modal-fullscreen': isMobile.value,
  'modal-centered': !isMobile.value
}));
</script>

<style scoped>
/* Mobile: fullscreen modal */
.modal-fullscreen ion-modal {
  --width: 100%;
  --height: 100%;
  --border-radius: 0;
}

/* Tablet and desktop: centered card */
.modal-centered ion-modal {
  --width: 90%;
  --max-width: 800px;
  --height: auto;
  --max-height: 90vh;
  --border-radius: 12px;
}

.recipe-hero-image {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.recipe-body {
  padding: 24px;
}

@media (max-width: 767px) {
  .recipe-body {
    padding: 16px;
  }
}
</style>
```

#### PhotoPantryUploadModal

**Implementation Location**: `omniscan-ui/src/components/PhotoPantryUploadModal.vue`

```vue
<template>
  <ion-modal :is-open="isOpen" @didDismiss="$emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Upload Photos</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="$emit('close')">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <div class="upload-container">
        <div class="photo-grid">
          <div 
            v-for="(photo, idx) in photos" 
            :key="idx"
            class="photo-preview"
          >
            <img :src="photo.url" :alt="`Photo ${idx + 1}`" />
            <ion-button 
              size="small" 
              fill="clear" 
              class="remove-btn"
              @click="removePhoto(idx)"
            >
              <ion-icon :icon="closeCircleOutline" />
            </ion-button>
          </div>
          
          <button 
            type="button" 
            class="add-photo-btn"
            @click="addPhoto"
          >
            <ion-icon :icon="addOutline" />
            <span>Add Photo</span>
          </button>
        </div>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.upload-container {
  padding: 16px;
}

.photo-grid {
  display: grid;
  gap: 12px;
}

/* Mobile: 2 columns */
@media (max-width: 767px) {
  .photo-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Tablet: 3 columns */
@media (min-width: 768px) and (max-width: 1023px) {
  .photo-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

/* Desktop: 4 columns */
@media (min-width: 1024px) {
  .photo-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

.photo-preview {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: var(--ion-color-light);
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  --background: rgba(0, 0, 0, 0.5);
  --color: white;
  min-width: 32px;
  min-height: 32px;
}

.add-photo-btn {
  aspect-ratio: 1;
  border: 2px dashed var(--ion-border-color);
  border-radius: 8px;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.2s;
  min-height: 44px; /* Touch target */
}

.add-photo-btn:hover {
  background: var(--ion-color-light);
}
</style>
```

## Typography Layer

### Responsive Typography System

**Implementation Location**: `omniscan-ui/src/theme/typography.css`

```css
:root {
  /* Base font size: 16px across all viewports */
  font-size: 16px;
  
  /* Mobile type scale */
  --font-size-h1: 28px;
  --font-size-h2: 24px;
  --font-size-h3: 20px;
  --font-size-h4: 18px;
  --font-size-h5: 16px;
  --font-size-h6: 14px;
  --font-size-body: 16px;
  --font-size-small: 14px;
  --font-size-tiny: 12px;
  
  /* Line heights */
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.6;
}

/* Tablet and desktop: scale up headings by 10-15% */
@media (min-width: 768px) {
  :root {
    --font-size-h1: 32px;
    --font-size-h2: 28px;
    --font-size-h3: 22px;
    --font-size-h4: 20px;
  }
}

@media (min-width: 1024px) {
  :root {
    --font-size-h1: 36px;
    --font-size-h2: 30px;
    --font-size-h3: 24px;
    --font-size-h4: 20px;
  }
}

/* Apply typography scale */
body {
  font-size: var(--font-size-body);
  line-height: var(--line-height-normal);
}

h1 {
  font-size: var(--font-size-h1);
  line-height: var(--line-height-tight);
  font-weight: 700;
  margin: 0 0 16px 0;
}

h2 {
  font-size: var(--font-size-h2);
  line-height: var(--line-height-tight);
  font-weight: 600;
  margin: 0 0 12px 0;
}

h3 {
  font-size: var(--font-size-h3);
  line-height: var(--line-height-tight);
  font-weight: 600;
  margin: 0 0 12px 0;
}

h4, h5, h6 {
  font-size: var(--font-size-h4);
  line-height: var(--line-height-normal);
  font-weight: 600;
  margin: 0 0 8px 0;
}

p {
  margin: 0 0 16px 0;
  line-height: var(--line-height-relaxed);
}

/* Long-form content: constrain line length */
.long-form-content {
  max-width: 75ch; /* ~75 characters per line */
  margin-left: auto;
  margin-right: auto;
}

/* Small text */
.text-small {
  font-size: var(--font-size-small);
}

.text-tiny {
  font-size: var(--font-size-tiny);
}

/* Ensure inputs meet minimum font size for iOS */
input,
textarea,
select,
ion-input,
ion-textarea,
ion-select {
  font-size: 16px !important; /* Prevent zoom on iOS */
}
```

## Asset Layer

### Responsive Images

**Implementation Location**: `omniscan-ui/src/theme/images.css` and component templates

**Base Image Styles**:

```css
/* Default responsive image behavior */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Grid images: cover for consistent dimensions */
.image-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Detail view images: contain to show full image */
.image-contain {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Maintain aspect ratios */
.aspect-16-9 {
  aspect-ratio: 16 / 9;
}

.aspect-4-3 {
  aspect-ratio: 4 / 3;
}

.aspect-1-1 {
  aspect-ratio: 1 / 1;
}
```

**Responsive Image Component**:

**Implementation Location**: `omniscan-ui/src/components/ResponsiveImage.vue`

```vue
<template>
  <picture>
    <source 
      v-if="srcset.desktop"
      :srcset="srcset.desktop" 
      media="(min-width: 1024px)"
    />
    <source 
      v-if="srcset.tablet"
      :srcset="srcset.tablet" 
      media="(min-width: 768px)"
    />
    <img 
      :src="src" 
      :alt="alt"
      :width="width"
      :height="height"
      :class="imageClass"
      loading="lazy"
    />
  </picture>
</template>

<script setup lang="ts">
interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  srcset?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  objectFit?: 'cover' | 'contain';
}

const props = withDefaults(defineProps<Props>(), {
  objectFit: 'cover'
});

const imageClass = computed(() => ({
  'image-cover': props.objectFit === 'cover',
  'image-contain': props.objectFit === 'contain',
}));
</script>
```

**Usage Example**:

```vue
<ResponsiveImage 
  :src="product.imageUrl"
  :alt="product.name"
  :width="400"
  :height="400"
  :srcset="{
    tablet: product.imageUrl800,
    desktop: product.imageUrl1200
  }"
  object-fit="cover"
/>
```

## Touch Target & Accessibility

### Touch Target Standards

**Implementation Location**: `omniscan-ui/src/theme/accessibility.css`

```css
/* Minimum touch target size: 44x44px */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Minimum spacing between touch targets */
.touch-target + .touch-target {
  margin-left: 8px;
}

/* Icon buttons: ensure adequate padding */
ion-button[size="small"] {
  --padding-start: 12px;
  --padding-end: 12px;
  min-height: 44px;
}

/* Text links in paragraphs: adequate tap area */
p a {
  padding: 4px 2px;
  margin: -4px -2px;
  display: inline-block;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
}

/* Form inputs: minimum height */
ion-input,
ion-textarea,
ion-select {
  --min-height: 44px;
}
```

### Focus States

```css
/* Keyboard focus indicators */
:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}

/* Remove outline for mouse users (keep for keyboard) */
:focus:not(:focus-visible) {
  outline: none;
}
```

## Dark Mode Support

### Dark Mode Implementation

**Implementation Location**: Existing Ionic theme files

Ionic already provides dark mode support. Ensure responsive layouts work identically in both modes:

```css
/* Ensure borders are visible in dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --ion-border-color: rgba(255, 255, 255, 0.12);
  }
  
  /* Adjust shadows for dark mode */
  .card-shadow {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }
}

/* Light mode borders */
@media (prefers-color-scheme: light) {
  :root {
    --ion-border-color: rgba(0, 0, 0, 0.12);
  }
  
  .card-shadow {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}
```

**Contrast Ratios**: All text must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text).

## Form Layouts

### Responsive Form Patterns

**Implementation Location**: `omniscan-ui/src/theme/forms.css`

```css
.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
}

/* Tablet and desktop: multi-column layouts for related fields */
@media (min-width: 768px) {
  .form-row--two-col {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .form-row--three-col {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Label positioning */
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Tablet and desktop: inline labels for checkboxes/radios */
@media (min-width: 768px) {
  .form-field--inline {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }
  
  .form-field--inline label {
    min-width: 150px;
  }
}

/* Input field spacing */
.form-field + .form-field {
  margin-top: 12px;
}
```

## Performance Optimizations

### CSS-Based Responsive Techniques

- **Prefer CSS over JavaScript**: Use CSS media queries for layout changes, reserving JavaScript only for conditional component rendering
- **Use CSS Custom Properties**: Define breakpoint-based values as CSS variables for consistency
- **Avoid Layout Thrashing**: Batch DOM reads and writes during resize events

### Image Optimization

**Implementation**:

1. **Lazy Loading**: Add `loading="lazy"` attribute to all images
2. **Responsive Images**: Use `<picture>` element with multiple sources for different viewports
3. **Aspect Ratio Boxes**: Define aspect ratios in CSS to prevent layout shift

```vue
<img 
  :src="imageUrl" 
  :alt="altText"
  :width="width"
  :height="height"
  loading="lazy"
  class="aspect-16-9"
/>
```

### CSS Delivery

**Vite Configuration** (`omniscan-ui/vite.config.ts`):

```typescript
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/theme/variables.scss";`
      }
    }
  },
  build: {
    cssCodeSplit: false, // Single CSS bundle
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
```

## Testing Strategy

### Responsive Testing Approach

**Test Categories**:

1. **Viewport Testing**: Test at exact breakpoints (320px, 768px, 1024px, 1280px) and intermediate sizes
2. **Visual Regression**: Capture screenshots at each breakpoint for comparison
3. **Touch Target Validation**: Use browser dev tools to verify minimum sizes
4. **Content Overflow**: Ensure no horizontal scrolling at standard widths
5. **Device Testing**: Test on actual iOS and Android devices

**Testing Tools**:

- **Browser DevTools**: Responsive design mode for viewport testing
- **Cypress**: E2E tests with viewport commands
- **Vitest**: Unit tests for composables like `useBreakpoint`

**Example Cypress Test**:

```typescript
describe('HomePage Responsive Layout', () => {
  const breakpoints = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 }
  ];

  breakpoints.forEach(({ name, width, height }) => {
    it(`displays correctly on ${name}`, () => {
      cy.viewport(width, height);
      cy.visit('/home');
      
      // Test stat cards column count
      if (name === 'mobile') {
        cy.get('.stats-row').should('have.css', 'grid-template-columns', '1fr 1fr');
      } else if (name === 'tablet') {
        cy.get('.stats-row').should('have.css', 'grid-template-columns', 'repeat(2, 1fr)');
      } else {
        cy.get('.stats-row').should('have.css', 'grid-template-columns', 'repeat(4, 1fr)');
      }
      
      // Verify no horizontal scroll
      cy.window().then(win => {
        expect(win.document.body.scrollWidth).to.equal(win.innerWidth);
      });
    });
  });
});
```

## Graceful Degradation

### Browser Support Strategy

**Target Browsers**:
- Chrome/Edge 90+
- Safari 14+
- Firefox 88+
- iOS Safari 14+
- Chrome Android 90+

**Fallback Patterns**:

```css
/* CSS Grid with Flexbox fallback */
.grid-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

@supports (display: grid) {
  .grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
}

/* Custom properties with fallbacks */
.element {
  padding: 16px; /* fallback */
  padding: var(--container-padding, 16px);
}
```

**Progressive Enhancement Checklist**:
- ✅ Core navigation accessible with basic CSS
- ✅ Forms functional without CSS Grid
- ✅ Content readable without custom properties
- ✅ Touch targets meet minimum size without modern layout

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Touch Target Minimum Dimensions

*For any* interactive element (button, link, input, tab, icon button) at any viewport width, the element's rendered dimensions (width and height) SHALL be at least 44px × 44px.

**Validates: Requirements 5.7, 11.1, 11.2**

### Property 2: Adjacent Touch Target Spacing

*For any* two adjacent interactive elements at any viewport width, the spacing between their bounding boxes SHALL be at least 8px.

**Validates: Requirements 11.3**

### Property 3: Input Field Minimum Font Size

*For any* input field (text input, textarea, select) in any form, the computed font-size SHALL be at least 16px to prevent automatic zoom on iOS.

**Validates: Requirements 9.4**

### Property 4: Input Field Minimum Height

*For any* input field (text input, textarea, select) in any form at any viewport width, the element's minimum height SHALL be at least 44px for touch accessibility.

**Validates: Requirements 9.3**

### Property 5: Form Field Spacing

*For any* two consecutive form fields in any form, the spacing (margin or gap) between them SHALL be at least 12px.

**Validates: Requirements 9.6**

### Property 6: Camera Preview Aspect Ratio Preservation

*For any* viewport width, the camera preview component SHALL maintain a consistent aspect ratio (4:3) regardless of container width.

**Validates: Requirements 6.1**

### Property 7: Pantry Grid Equal Card Heights

*For any* row of pantry item cards in the grid layout, all cards within that row SHALL have equal height using CSS Grid auto-rows.

**Validates: Requirements 7.4**

### Property 8: Recipe Card Image Aspect Ratio

*For any* recipe card at any viewport width, the recipe image SHALL maintain a 16:9 aspect ratio regardless of the image's original dimensions.

**Validates: Requirements 8.5**

### Property 9: Responsive Image Proportional Scaling

*For any* image element, the CSS properties SHALL include max-width: 100% and height: auto to enable proportional scaling within containers.

**Validates: Requirements 13.1**

### Property 10: Grid Product Images Use Object-Fit Cover

*For any* product image displayed in a grid layout (pantry grid, search results), the CSS object-fit property SHALL be set to 'cover' for consistent dimensions.

**Validates: Requirements 13.2**

### Property 11: Detail View Product Images Use Object-Fit Contain

*For any* product image displayed in a detail view or modal, the CSS object-fit property SHALL be set to 'contain' to show the full image.

**Validates: Requirements 13.3**

### Property 12: Images Include Dimension Attributes

*For any* image element in the application, the HTML SHALL include explicit width and height attributes to prevent layout shift during loading.

**Validates: Requirements 13.4**

### Property 13: Carousel Images Maintain Consistent Aspect Ratio

*For any* carousel or gallery component, all images within that component SHALL maintain the same aspect ratio for visual consistency.

**Validates: Requirements 13.6**

### Property 14: Modal Internal Scrolling with Fixed Header/Footer

*For any* modal dialog containing content that exceeds the viewport height, the modal SHALL enable internal scrolling of the body while keeping the header and footer visible and fixed.

**Validates: Requirements 14.4**

### Property 15: Modal Backdrop Presence

*For any* modal dialog at any viewport width, a semi-transparent backdrop overlay SHALL be rendered behind the modal to darken the background.

**Validates: Requirements 14.5**

### Property 16: Notification Cards Adequate Spacing

*For any* two consecutive notification cards, the spacing between them SHALL meet touch interaction requirements (minimum 8px).

**Validates: Requirements 15.3**

### Property 17: Loading Spinner Proportional Sizing

*For any* loading spinner component, the spinner size SHALL scale proportionally with viewport width (smaller on mobile, larger on desktop).

**Validates: Requirements 16.4**

### Property 18: Adaptive Component Viewport-Scaled Padding

*For any* adaptive component (components that change layout based on viewport), padding and spacing values SHALL increase proportionally from mobile to desktop viewports.

**Validates: Requirements 16.5**

### Property 19: Image Lazy Loading

*For any* image element, the loading attribute SHALL be set to "lazy" or an Intersection Observer SHALL be used to implement lazy loading for off-screen images.

**Validates: Requirements 17.3**

### Property 20: Layout Consistency Across Themes

*For any* page at any viewport width, the computed spacing, padding, and layout metrics SHALL be identical in both light mode and dark mode.

**Validates: Requirements 18.1**

### Property 21: Dark Mode Text Contrast Ratio

*For any* text element displayed in dark mode, the contrast ratio between the text color and background color SHALL be at least 4.5:1 for normal text (3:1 for large text).

**Validates: Requirements 18.2**

### Property 22: Dark Mode Border Visibility

*For any* border or divider element in dark mode, the border SHALL have sufficient contrast against its background to be clearly visible.

**Validates: Requirements 18.3**

### Property 23: Dark Mode Shadow Visibility

*For any* element using box-shadow for depth perception in dark mode, the shadow SHALL be adjusted in opacity and color to remain visible and appropriate.

**Validates: Requirements 18.4**

### Property 24: No Horizontal Scrolling at Standard Viewports

*For any* page at standard viewport widths (320px, 768px, 1024px, 1280px), the page SHALL NOT cause a horizontal scrollbar to appear (document.body.scrollWidth SHALL equal window.innerWidth).

**Validates: Requirements 19.4**

### Property 25: Body Text Line Height

*For any* body text element, the computed line-height SHALL be between 1.4 and 1.6 for optimal readability.

**Validates: Requirements 12.5**

## Implementation Plan

### Phase 1: Foundation Setup (Week 1)

1. Configure viewport meta tags in `index.html`
2. Create breakpoint system in `theme/breakpoints.css`
3. Implement `useBreakpoint` composable
4. Set up content container system in `theme/layout.css`
5. Create responsive grid utilities in `theme/grid.css`
6. Configure responsive typography in `theme/typography.css`

### Phase 2: Navigation Implementation (Week 1-2)

1. Create `DesktopNav.vue` component for sidebar navigation
2. Update `App.vue` to conditionally render mobile tabs vs desktop nav
3. Test navigation switching at 1024px breakpoint
4. Verify touch target sizes for navigation items

### Phase 3: Page-by-Page Responsive Layouts (Week 2-4)

1. **HomePage**: Implement responsive stat cards, recipe grid, greeting header
2. **ScanPage**: Implement responsive camera preview, scan button positioning
3. **PantryPage**: Implement responsive grid with filter controls
4. **RecipeSuggestionsPage**: Implement responsive recipe grid with controls
5. **ProfilePage**: Implement responsive profile header layout
6. **SettingsPage**: Implement constrained settings container
7. **NotificationsPage**: Implement constrained notification list

### Phase 4: Shared Components (Week 4-5)

1. Update `ScanResultCard` for responsive layout
2. Update `RecipeDetailModal` for adaptive modal presentation
3. Update `PhotoPantryUploadModal` for responsive photo grid
4. Create `ResponsiveImage` component for optimized image loading

### Phase 5: Forms & Accessibility (Week 5)

1. Implement responsive form layouts
2. Ensure all touch targets meet minimum size
3. Verify input font sizes prevent iOS zoom
4. Test keyboard navigation and focus states

### Phase 6: Testing & Optimization (Week 6)

1. Write Cypress tests for responsive layouts
2. Test on physical devices (iOS and Android)
3. Optimize CSS delivery and minification
4. Implement image lazy loading
5. Verify dark mode compatibility
6. Performance testing and optimization

## Risks & Mitigations

### Risk 1: Ionic Component Limitations

**Risk**: Ionic components may have built-in styles that conflict with custom responsive layouts.

**Mitigation**: 
- Use Ionic's CSS variables to customize component behavior
- Apply custom classes and CSS overrides where needed
- Use `::part()` pseudo-element to style Shadow DOM components
- Test thoroughly with Ionic's responsive utilities

### Risk 2: Performance on Lower-End Devices

**Risk**: Complex responsive layouts may cause performance issues on older mobile devices.

**Mitigation**:
- Minimize JavaScript-based viewport detection
- Use CSS-only solutions where possible
- Implement lazy loading for images
- Profile performance on target devices
- Use `will-change` sparingly and strategically

### Risk 3: Browser Compatibility

**Risk**: Older browsers may not support CSS Grid or modern CSS features.

**Mitigation**:
- Provide Flexbox fallbacks for CSS Grid layouts
- Use `@supports` queries for progressive enhancement
- Define minimum browser versions in documentation
- Test on target browser versions

### Risk 4: Content Overflow on Small Screens

**Risk**: Long text or fixed-width content may cause horizontal scrolling on small viewports.

**Mitigation**:
- Use relative units (%, rem, em) instead of fixed pixels
- Apply `overflow-wrap: break-word` to text containers
- Test with long product names and user-generated content
- Constrain maximum widths appropriately

### Risk 5: Touch Target Compliance

**Risk**: Existing UI elements may not meet minimum touch target sizes.

**Mitigation**:
- Conduct accessibility audit of all interactive elements
- Add padding to increase tap areas without changing visual size
- Ensure minimum 8px spacing between adjacent targets
- Use browser dev tools to measure touch target dimensions

## Success Criteria

The responsive web design implementation will be considered successful when:

1. ✅ All pages display correctly at mobile (320px), tablet (768px), and desktop (1024px+) breakpoints
2. ✅ No horizontal scrolling occurs at standard viewport widths
3. ✅ All interactive elements meet 44px × 44px minimum touch target size
4. ✅ Navigation adapts correctly between mobile tabs and desktop sidebar
5. ✅ Forms are usable and accessible at all viewport sizes
6. ✅ Images load efficiently using lazy loading and responsive techniques
7. ✅ Typography scales appropriately across breakpoints
8. ✅ Dark mode works identically to light mode for all responsive layouts
9. ✅ All correctness properties pass automated tests
10. ✅ Physical device testing confirms usability on iOS and Android

## Conclusion

This design establishes a comprehensive responsive transformation for OmniScan's user-facing application. By leveraging Ionic Framework's component system and augmenting it with modern CSS responsive patterns, the implementation will provide optimal experiences across mobile, tablet, and desktop devices while maintaining code quality, performance, and accessibility standards.

The mobile-first approach ensures that the core functionality remains accessible on all devices, with progressive enhancement providing richer experiences on larger screens. The systematic breakpoint system, content constraints, and adaptive components create a consistent and maintainable foundation for responsive design across the application.
