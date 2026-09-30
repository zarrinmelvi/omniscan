import { ref, onMounted, onUnmounted, computed } from 'vue';

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
