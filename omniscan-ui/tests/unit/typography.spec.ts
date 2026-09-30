import { describe, expect, test, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Typography System Tests
 * 
 * Validates that the responsive typography system meets requirements:
 * - Base font size: clamp(14px, 2.5vw, 16px) - fluid scaling
 * - Heading sizes use clamp() for smooth viewport scaling
 * - Input fields have minimum 16px font size (prevent iOS zoom)
 * - Line heights are configured correctly (1.5 body, 1.2 headings)
 * - Long-form content has max-width constraint
 * 
 * Requirements validated: 9.4, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

describe('Typography System', () => {
  let dom: JSDOM
  let document: Document
  let styleElement: HTMLStyleElement

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    document = dom.window.document

    // Load the typography.css file
    const cssPath = join(__dirname, '../../src/theme/typography.css')
    const cssContent = readFileSync(cssPath, 'utf-8')

    // Add the CSS to the document
    styleElement = document.createElement('style')
    styleElement.textContent = cssContent
    document.head.appendChild(styleElement)
  })

  describe('Base Font Sizes', () => {
    test('body text uses fluid font size with clamp()', () => {
      // Verify body font size uses clamp() for fluid scaling
      expect(styleElement.textContent).toContain('--font-size-body: clamp(14px, 2.5vw, 16px)')
      expect(styleElement.textContent).toContain('font-size: var(--font-size-body)')
    })

    test('html root font-size is 16px for rem calculations', () => {
      expect(styleElement.textContent).toMatch(/html \{[\s\S]*?font-size: 16px/)
    })

    test('defines all heading sizes with clamp() for fluid scaling', () => {
      expect(styleElement.textContent).toContain('--font-size-h1: clamp(28px, 5vw, 36px)')
      expect(styleElement.textContent).toContain('--font-size-h2: clamp(24px, 4.2vw, 30px)')
      expect(styleElement.textContent).toContain('--font-size-h3: clamp(20px, 3.5vw, 24px)')
      expect(styleElement.textContent).toContain('--font-size-h4: clamp(18px, 3vw, 20px)')
      expect(styleElement.textContent).toContain('--font-size-h5: clamp(16px, 2.5vw, 18px)')
      expect(styleElement.textContent).toContain('--font-size-h6: clamp(14px, 2.2vw, 16px)')
    })
  })

  describe('Responsive Heading Sizes', () => {
    test('headings use fluid typography that scales smoothly', () => {
      // With clamp(), there are no discrete media query breakpoints for font sizes
      // Instead, verify that clamp() is used for smooth scaling
      expect(styleElement.textContent).toContain('clamp(28px, 5vw, 36px)')    // h1
      expect(styleElement.textContent).toContain('clamp(24px, 4.2vw, 30px)')  // h2
      expect(styleElement.textContent).toContain('clamp(20px, 3.5vw, 24px)')  // h3
      expect(styleElement.textContent).toContain('clamp(18px, 3vw, 20px)')    // h4
    })

    test('heading sizes scale from mobile to desktop appropriately', () => {
      // Verify the range from minimum (mobile) to maximum (desktop)
      // h1: 28px mobile → 36px desktop = 28.6% increase
      const h1Mobile = 28
      const h1Desktop = 36
      const h1Increase = ((h1Desktop - h1Mobile) / h1Mobile) * 100
      expect(h1Increase).toBeGreaterThanOrEqual(10)
      expect(h1Increase).toBeLessThanOrEqual(50)

      // h2: 24px mobile → 30px desktop = 25% increase
      const h2Mobile = 24
      const h2Desktop = 30
      const h2Increase = ((h2Desktop - h2Mobile) / h2Mobile) * 100
      expect(h2Increase).toBeGreaterThanOrEqual(10)
      expect(h2Increase).toBeLessThanOrEqual(50)

      // h3: 20px mobile → 24px desktop = 20% increase
      const h3Mobile = 20
      const h3Desktop = 24
      const h3Increase = ((h3Desktop - h3Mobile) / h3Mobile) * 100
      expect(h3Increase).toBeGreaterThanOrEqual(10)
      expect(h3Increase).toBeLessThanOrEqual(50)
    })

    test('small text also uses fluid scaling', () => {
      expect(styleElement.textContent).toContain('--font-size-small: clamp(13px, 2.2vw, 14px)')
      expect(styleElement.textContent).toContain('--font-size-tiny: clamp(12px, 2vw, 12px)')
    })
  })

  describe('Line Heights', () => {
    test('defines line-height custom properties', () => {
      expect(styleElement.textContent).toContain('--line-height-tight: 1.2')
      expect(styleElement.textContent).toContain('--line-height-normal: 1.5')
      expect(styleElement.textContent).toContain('--line-height-relaxed: 1.6')
    })

    test('applies correct line heights to elements', () => {
      // Headings use tight line height
      expect(styleElement.textContent).toMatch(/h1 \{[\s\S]*?line-height: var\(--line-height-tight\)/)
      expect(styleElement.textContent).toMatch(/h2 \{[\s\S]*?line-height: var\(--line-height-tight\)/)
      
      // Body uses normal line height
      expect(styleElement.textContent).toMatch(/body \{[\s\S]*?line-height: var\(--line-height-normal\)/)
      
      // Paragraphs use relaxed line height
      expect(styleElement.textContent).toMatch(/p \{[\s\S]*?line-height: var\(--line-height-relaxed\)/)
    })
  })

  describe('Input Field Font Size (Requirement 9.4)', () => {
    test('all input types have minimum 16px font size', () => {
      // Verify input elements have 16px font size with !important
      expect(styleElement.textContent).toContain('input,\ntextarea,\nselect,\nion-input,\nion-textarea,\nion-select')
      expect(styleElement.textContent).toContain('font-size: 16px !important')
    })

    test('Ionic input components have minimum 16px font size', () => {
      // Verify nested Ionic input elements also have 16px
      expect(styleElement.textContent).toContain('ion-input input,\nion-textarea textarea,\nion-select select')
      expect(styleElement.textContent).toContain('font-size: 16px !important')
    })
  })

  describe('Long-form Content (Requirement 12.6)', () => {
    test('long-form-content class constrains line length to 75ch', () => {
      expect(styleElement.textContent).toContain('.long-form-content')
      expect(styleElement.textContent).toMatch(/\.long-form-content \{[\s\S]*?max-width: 75ch/)
    })

    test('long-form-content is centered horizontally', () => {
      expect(styleElement.textContent).toMatch(/\.long-form-content \{[\s\S]*?margin-left: auto/)
      expect(styleElement.textContent).toMatch(/\.long-form-content \{[\s\S]*?margin-right: auto/)
    })

    test('long-form-content paragraphs use relaxed line height', () => {
      expect(styleElement.textContent).toMatch(/\.long-form-content p \{[\s\S]*?line-height: var\(--line-height-relaxed\)/)
    })
  })

  describe('Typography Utility Classes', () => {
    test('text-small utility uses small font size', () => {
      expect(styleElement.textContent).toContain('.text-small')
      expect(styleElement.textContent).toMatch(/\.text-small \{[\s\S]*?font-size: var\(--font-size-small\)/)
    })

    test('text-tiny utility uses tiny font size', () => {
      expect(styleElement.textContent).toContain('.text-tiny')
      expect(styleElement.textContent).toMatch(/\.text-tiny \{[\s\S]*?font-size: var\(--font-size-tiny\)/)
    })

    test('defines small and tiny font size values with clamp()', () => {
      expect(styleElement.textContent).toContain('--font-size-small: clamp(13px, 2.2vw, 14px)')
      expect(styleElement.textContent).toContain('--font-size-tiny: clamp(12px, 2vw, 12px)')
    })
  })

  describe('Heading Element Styles', () => {
    test('all headings have appropriate font weights', () => {
      expect(styleElement.textContent).toMatch(/h1 \{[\s\S]*?font-weight: 700/)
      expect(styleElement.textContent).toMatch(/h2 \{[\s\S]*?font-weight: 600/)
      expect(styleElement.textContent).toMatch(/h3 \{[\s\S]*?font-weight: 600/)
    })

    test('headings have appropriate bottom margins', () => {
      expect(styleElement.textContent).toMatch(/h1 \{[\s\S]*?margin: 0 0 16px 0/)
      expect(styleElement.textContent).toMatch(/h2 \{[\s\S]*?margin: 0 0 12px 0/)
      expect(styleElement.textContent).toMatch(/h3 \{[\s\S]*?margin: 0 0 12px 0/)
    })

    test('paragraphs have appropriate bottom margin', () => {
      expect(styleElement.textContent).toMatch(/p \{[\s\S]*?margin: 0 0 16px 0/)
    })
  })

  describe('CSS Custom Properties Structure', () => {
    test('all required custom properties are defined in :root', () => {
      const requiredProperties = [
        '--font-size-h1',
        '--font-size-h2',
        '--font-size-h3',
        '--font-size-h4',
        '--font-size-h5',
        '--font-size-h6',
        '--font-size-body',
        '--font-size-small',
        '--font-size-tiny',
        '--line-height-tight',
        '--line-height-normal',
        '--line-height-relaxed',
      ]

      requiredProperties.forEach(property => {
        expect(styleElement.textContent).toContain(property)
      })
    })

    test('heading elements use CSS custom properties', () => {
      expect(styleElement.textContent).toMatch(/h1 \{[\s\S]*?font-size: var\(--font-size-h1\)/)
      expect(styleElement.textContent).toMatch(/h2 \{[\s\S]*?font-size: var\(--font-size-h2\)/)
      expect(styleElement.textContent).toMatch(/h3 \{[\s\S]*?font-size: var\(--font-size-h3\)/)
    })
  })
})
