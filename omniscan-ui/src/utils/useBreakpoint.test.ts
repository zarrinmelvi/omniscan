/**
 * Unit tests for useBreakpoint composable
 *
 * Tests the reactive breakpoint detection system that identifies viewport
 * size categories (mobile, tablet, desktop) and updates on window resize.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick } from 'vue';
import { useBreakpoint } from './useBreakpoint';

// Helper component to test the composable
const TestComponent = defineComponent({
  setup() {
    const breakpointData = useBreakpoint();
    return { breakpointData };
  },
  template: '<div>{{ breakpointData.breakpoint }}</div>',
});

describe('useBreakpoint', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    // Store original window width
    originalInnerWidth = window.innerWidth;
    
    // Clear all event listeners
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  /**
   * Test mobile breakpoint detection (< 768px)
   * Validates: Requirement 2.1
   */
  it('should detect mobile breakpoint for width < 768px', async () => {
    // Set window width to mobile size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('mobile');
    expect(wrapper.vm.breakpointData.width.value).toBe(375);
    expect(wrapper.vm.breakpointData.isMobile.value).toBe(true);
    expect(wrapper.vm.breakpointData.isTablet.value).toBe(false);
    expect(wrapper.vm.breakpointData.isDesktop.value).toBe(false);
  });

  /**
   * Test mobile breakpoint at minimum width (320px)
   * Validates: Requirement 2.1
   */
  it('should detect mobile breakpoint at 320px', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 320,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('mobile');
    expect(wrapper.vm.breakpointData.isMobile.value).toBe(true);
  });

  /**
   * Test tablet breakpoint detection (768px - 1023px)
   * Validates: Requirement 2.2
   */
  it('should detect tablet breakpoint for width >= 768px and < 1024px', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('tablet');
    expect(wrapper.vm.breakpointData.width.value).toBe(768);
    expect(wrapper.vm.breakpointData.isMobile.value).toBe(false);
    expect(wrapper.vm.breakpointData.isTablet.value).toBe(true);
    expect(wrapper.vm.breakpointData.isDesktop.value).toBe(false);
  });

  /**
   * Test tablet breakpoint at mid-range (900px)
   * Validates: Requirement 2.2
   */
  it('should detect tablet breakpoint at 900px', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 900,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('tablet');
    expect(wrapper.vm.breakpointData.isTablet.value).toBe(true);
  });

  /**
   * Test desktop breakpoint detection (>= 1024px)
   * Validates: Requirement 2.3
   */
  it('should detect desktop breakpoint for width >= 1024px', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('desktop');
    expect(wrapper.vm.breakpointData.width.value).toBe(1024);
    expect(wrapper.vm.breakpointData.isMobile.value).toBe(false);
    expect(wrapper.vm.breakpointData.isTablet.value).toBe(false);
    expect(wrapper.vm.breakpointData.isDesktop.value).toBe(true);
  });

  /**
   * Test desktop breakpoint at wide screen (1920px)
   * Validates: Requirement 2.3
   */
  it('should detect desktop breakpoint at 1920px', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('desktop');
    expect(wrapper.vm.breakpointData.isDesktop.value).toBe(true);
  });

  /**
   * Test breakpoint boundary at 767px (should be mobile)
   * Validates: Requirement 2.1, 2.2 boundary
   */
  it('should detect mobile breakpoint at 767px (just below tablet)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 767,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('mobile');
    expect(wrapper.vm.breakpointData.isMobile.value).toBe(true);
  });

  /**
   * Test breakpoint boundary at 1023px (should be tablet)
   * Validates: Requirement 2.2, 2.3 boundary
   */
  it('should detect tablet breakpoint at 1023px (just below desktop)', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1023,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('tablet');
    expect(wrapper.vm.breakpointData.isTablet.value).toBe(true);
  });

  /**
   * Test reactive updates on window resize
   * Validates: Requirement 2.5
   */
  it('should update breakpoint on window resize', async () => {
    // Start with mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('mobile');

    // Resize to tablet
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });
    window.dispatchEvent(new Event('resize'));
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('tablet');
    expect(wrapper.vm.breakpointData.width.value).toBe(768);

    // Resize to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    window.dispatchEvent(new Event('resize'));
    await nextTick();

    expect(wrapper.vm.breakpointData.breakpoint.value).toBe('desktop');
    expect(wrapper.vm.breakpointData.width.value).toBe(1280);
  });

  /**
   * Test that event listener is properly cleaned up
   * Validates: Requirement 2.5 (proper lifecycle management)
   */
  it('should remove resize listener on unmount', async () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const wrapper = mount(TestComponent);
    await nextTick();

    // Verify listener was added
    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    // Unmount component
    wrapper.unmount();

    // Verify listener was removed
    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  /**
   * Test computed properties are reactive
   * Validates: Requirement 2.5
   */
  it('should have reactive computed properties', async () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const wrapper = mount(TestComponent);
    await nextTick();

    // Initial state
    expect(wrapper.vm.breakpointData.isMobile.value).toBe(true);
    expect(wrapper.vm.breakpointData.isTablet.value).toBe(false);
    expect(wrapper.vm.breakpointData.isDesktop.value).toBe(false);

    // Change to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
    window.dispatchEvent(new Event('resize'));
    await nextTick();

    // Computed properties should update
    expect(wrapper.vm.breakpointData.isMobile.value).toBe(false);
    expect(wrapper.vm.breakpointData.isTablet.value).toBe(false);
    expect(wrapper.vm.breakpointData.isDesktop.value).toBe(true);
  });
});
