/**
 * Unit tests for ResponsiveImage component
 *
 * Tests the responsive image component that handles image display with
 * lazy loading, object-fit modes, and proper aspect ratio handling.
 *
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5, 17.3
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ResponsiveImage from './ResponsiveImage.vue';

describe('ResponsiveImage', () => {
  /**
   * Test that required props are properly passed to img element
   * Validates: Requirement 13.1, 13.4
   */
  it('should render img element with required src and alt attributes', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/test-image.jpg',
        alt: 'Test image description',
      },
    });

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('/test-image.jpg');
    expect(img.attributes('alt')).toBe('Test image description');
  });

  /**
   * Test width and height attributes prevent layout shift
   * Validates: Requirement 13.4
   */
  it('should include width and height attributes when provided', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/test-image.jpg',
        alt: 'Test image',
        width: 400,
        height: 300,
      },
    });

    const img = wrapper.find('img');
    expect(img.attributes('width')).toBe('400');
    expect(img.attributes('height')).toBe('300');
  });

  /**
   * Test lazy loading attribute is present
   * Validates: Requirement 17.3
   */
  it('should have loading="lazy" attribute for lazy loading', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/test-image.jpg',
        alt: 'Test image',
      },
    });

    const img = wrapper.find('img');
    expect(img.attributes('loading')).toBe('lazy');
  });

  /**
   * Test default objectFit is 'cover'
   * Validates: Requirement 13.2
   */
  it('should apply image-cover class by default', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/test-image.jpg',
        alt: 'Test image',
      },
    });

    const img = wrapper.find('img');
    expect(img.classes()).toContain('image-cover');
    expect(img.classes()).not.toContain('image-contain');
  });

  /**
   * Test objectFit='cover' applies correct class
   * Validates: Requirement 13.2
   */
  it('should apply image-cover class when objectFit is "cover"', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/test-image.jpg',
        alt: 'Test image',
        objectFit: 'cover',
      },
    });

    const img = wrapper.find('img');
    expect(img.classes()).toContain('image-cover');
    expect(img.classes()).not.toContain('image-contain');
  });

  /**
   * Test objectFit='contain' applies correct class
   * Validates: Requirement 13.3
   */
  it('should apply image-contain class when objectFit is "contain"', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/test-image.jpg',
        alt: 'Test image',
        objectFit: 'contain',
      },
    });

    const img = wrapper.find('img');
    expect(img.classes()).toContain('image-contain');
    expect(img.classes()).not.toContain('image-cover');
  });

  /**
   * Test that image element has proper responsive styles
   * Validates: Requirement 13.1
   */
  it('should render a simple img element (no picture/srcset per clarifications)', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/test-image.jpg',
        alt: 'Test image',
      },
    });

    // According to CLARIFICATIONS.md decision 5: Simple 2x approach, no picture/srcset
    expect(wrapper.find('picture').exists()).toBe(false);
    expect(wrapper.find('source').exists()).toBe(false);
    expect(wrapper.find('img').exists()).toBe(true);
  });

  /**
   * Test all props combined
   * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 17.3
   */
  it('should correctly apply all props together', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/product-image.jpg',
        alt: 'Product name',
        width: 800,
        height: 600,
        objectFit: 'contain',
      },
    });

    const img = wrapper.find('img');
    expect(img.attributes('src')).toBe('/product-image.jpg');
    expect(img.attributes('alt')).toBe('Product name');
    expect(img.attributes('width')).toBe('800');
    expect(img.attributes('height')).toBe('600');
    expect(img.attributes('loading')).toBe('lazy');
    expect(img.classes()).toContain('image-contain');
    expect(img.classes()).not.toContain('image-cover');
  });

  /**
   * Test that component works without optional props
   * Validates: Requirements 13.1, 13.2, 17.3
   */
  it('should work with only required props', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/test.jpg',
        alt: 'Test',
      },
    });

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('/test.jpg');
    expect(img.attributes('alt')).toBe('Test');
    expect(img.attributes('loading')).toBe('lazy');
    expect(img.classes()).toContain('image-cover'); // default
    expect(img.attributes('width')).toBeUndefined();
    expect(img.attributes('height')).toBeUndefined();
  });

  /**
   * Test computed property reactivity
   * Validates: Requirement 13.2, 13.3
   */
  it('should update class when objectFit prop changes', async () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/test-image.jpg',
        alt: 'Test image',
        objectFit: 'cover',
      },
    });

    let img = wrapper.find('img');
    expect(img.classes()).toContain('image-cover');

    // Change objectFit prop
    await wrapper.setProps({ objectFit: 'contain' });

    img = wrapper.find('img');
    expect(img.classes()).toContain('image-contain');
    expect(img.classes()).not.toContain('image-cover');
  });

  /**
   * Test grid image use case (cover)
   * Validates: Requirement 13.2
   */
  it('should support grid image use case with cover', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/product-thumb.jpg',
        alt: 'Product thumbnail',
        width: 300,
        height: 300,
        objectFit: 'cover',
      },
    });

    const img = wrapper.find('img');
    expect(img.classes()).toContain('image-cover');
    expect(img.attributes('width')).toBe('300');
    expect(img.attributes('height')).toBe('300');
  });

  /**
   * Test detail view image use case (contain)
   * Validates: Requirement 13.3
   */
  it('should support detail view image use case with contain', () => {
    const wrapper = mount(ResponsiveImage, {
      props: {
        src: '/product-detail.jpg',
        alt: 'Product detail view',
        width: 800,
        height: 600,
        objectFit: 'contain',
      },
    });

    const img = wrapper.find('img');
    expect(img.classes()).toContain('image-contain');
    expect(img.attributes('width')).toBe('800');
    expect(img.attributes('height')).toBe('600');
  });
});
