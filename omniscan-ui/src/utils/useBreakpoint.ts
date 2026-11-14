import { ref, onMounted, onUnmounted, computed } from 'vue';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint() {
  function getBreakpoint(w: number): Breakpoint {
    if (w >= 1024) return 'desktop';
    if (w >= 768) return 'tablet';
    return 'mobile';
  }
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 0);
  const breakpoint = ref<Breakpoint>(typeof window !== 'undefined' ? getBreakpoint(window.innerWidth) : 'mobile');

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
