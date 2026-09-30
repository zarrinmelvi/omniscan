import { describe, expect, test, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Responsive Image Utilities Tests
 * 
 * Validates that the responsive image system meets requirements:
 * - Default img styles: max-width 100%, height auto
 * - image-cover and image-contain classes
 * - Aspect ratio utility classes (aspect-16-9, aspect-4-3, aspect-1-1)
 * 
 * Requirements validated: 13.1, 13.2, 13.3, 8.5
 */

describe('Responsive Image Utilities', () => {
  let dom: JSDOM
  let document: Document
  let styleElement: HTMLStyleElement

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    document = dom.window.document

    // Load the images.css file
    const cssPath = join(__dirname, '../../src/theme/images.css')
    const cssContent = readFileSync(cssPath, 'utf-8')

    // Add the CSS to the document
    styleElement = document.createElement('style')
    styleElement.textContent = cssContent
    document.head.appendChild(styleElement)
  })

  describe('Default Image Styles (Requirement 13.1)', () => {
    test('images have max-width 100%', () => {
      expect(styleElement.textContent).toContain('img {')
      expect(styleElement.textContent).toMatch(/img \{[\s\S]*?max-width: 100%/)
    })

    test('images have height auto for proportional scaling', () => {
      expect(styleElement.textContent).toMatch(/img \{[\s\S]*?height: auto/)
    })

    test('images display as block', () => {
      expect(styleElement.textContent).toMatch(/img \{[\s\S]*?display: block/)
    })
  })

  describe('Image Object-Fit Classes (Requirements 13.2, 13.3)', () => {
    test('image-cover class for grid layouts', () => {
      expect(styleElement.textContent).toContain('.image-cover')
      expect(styleElement.textContent).toMatch(/\.image-cover \{[\s\S]*?width: 100%/)
      expect(styleElement.textContent).toMatch(/\.image-cover \{[\s\S]*?height: 100%/)
      expect(styleElement.textContent).toMatch(/\.image-cover \{[\s\S]*?object-fit: cover/)
    })

    test('image-contain class for detail views', () => {
      expect(styleElement.textContent).toContain('.image-contain')
      expect(styleElement.textContent).toMatch(/\.image-contain \{[\s\S]*?width: 100%/)
      expect(styleElement.textContent).toMatch(/\.image-contain \{[\s\S]*?height: 100%/)
      expect(styleElement.textContent).toMatch(/\.image-contain \{[\s\S]*?object-fit: contain/)
    })
  })

  describe('Aspect Ratio Utility Classes (Requirements 13.1, 8.5)', () => {
    test('aspect-16-9 class for widescreen content', () => {
      expect(styleElement.textContent).toContain('.aspect-16-9')
      expect(styleElement.textContent).toMatch(/\.aspect-16-9 \{[\s\S]*?aspect-ratio: 16 \/ 9/)
    })

    test('aspect-4-3 class for standard content', () => {
      expect(styleElement.textContent).toContain('.aspect-4-3')
      expect(styleElement.textContent).toMatch(/\.aspect-4-3 \{[\s\S]*?aspect-ratio: 4 \/ 3/)
    })

    test('aspect-1-1 class for square content', () => {
      expect(styleElement.textContent).toContain('.aspect-1-1')
      expect(styleElement.textContent).toMatch(/\.aspect-1-1 \{[\s\S]*?aspect-ratio: 1 \/ 1/)
    })
  })

  describe('CSS Structure and Organization', () => {
    test('file includes descriptive comments', () => {
      expect(styleElement.textContent).toContain('Responsive Image Utilities')
      expect(styleElement.textContent).toContain('Default responsive image behavior')
      expect(styleElement.textContent).toContain('Grid images: cover for consistent dimensions')
      expect(styleElement.textContent).toContain('Detail view images: contain to show full image')
      expect(styleElement.textContent).toContain('Aspect ratio utility classes')
    })

    test('validates requirements comment is present', () => {
      expect(styleElement.textContent).toContain('Validates requirements: 13.1, 13.2, 13.3, 8.5')
    })
  })

  describe('Integration with Image Elements', () => {
    test('img elements inherit responsive behavior', () => {
      const img = document.createElement('img')
      img.src = 'test.jpg'
      img.alt = 'Test image'
      document.body.appendChild(img)

      // Verify the CSS rule exists (actual computed styles would require browser)
      expect(styleElement.textContent).toContain('img {')
    })

    test('image-cover and image-contain can be combined with aspect ratios', () => {
      // Verify both classes exist and can work together
      expect(styleElement.textContent).toContain('.image-cover')
      expect(styleElement.textContent).toContain('.aspect-16-9')
      
      // Both classes can be applied to same element
      const container = document.createElement('div')
      container.className = 'aspect-16-9'
      
      const img = document.createElement('img')
      img.className = 'image-cover'
      img.src = 'test.jpg'
      img.alt = 'Test image'
      
      container.appendChild(img)
      document.body.appendChild(container)

      // Verify elements are created correctly
      expect(container.className).toBe('aspect-16-9')
      expect(img.className).toBe('image-cover')
    })
  })

  describe('Recipe Image Use Case (Requirement 8.5)', () => {
    test('recipe cards can use 16:9 aspect ratio', () => {
      // Recipe images should maintain 16:9 aspect ratio
      expect(styleElement.textContent).toContain('.aspect-16-9')
      expect(styleElement.textContent).toMatch(/\.aspect-16-9 \{[\s\S]*?aspect-ratio: 16 \/ 9/)
    })
  })

  describe('Product Image Use Cases (Requirements 13.2, 13.3)', () => {
    test('grid product images use cover for consistent dimensions', () => {
      // Grid layouts need consistent dimensions
      expect(styleElement.textContent).toContain('.image-cover')
      expect(styleElement.textContent).toMatch(/\.image-cover \{[\s\S]*?object-fit: cover/)
    })

    test('detail view product images use contain to show full image', () => {
      // Detail views need to show the complete product
      expect(styleElement.textContent).toContain('.image-contain')
      expect(styleElement.textContent).toMatch(/\.image-contain \{[\s\S]*?object-fit: contain/)
    })
  })
})
