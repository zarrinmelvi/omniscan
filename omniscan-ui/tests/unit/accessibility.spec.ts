import { describe, expect, test, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Touch Target and Accessibility Tests
 * 
 * Validates that the accessibility system meets WCAG requirements:
 * - Touch targets minimum 44px × 44px
 * - Adjacent touch targets have 8px spacing
 * - Form inputs have 44px minimum height with 16px font size
 * - Text links have adequate tap area
 * - All buttons meet minimum dimensions
 * 
 * Requirements validated: 11.1, 11.2, 11.3, 11.4, 9.3
 */

describe('Touch Target and Accessibility', () => {
  let dom: JSDOM
  let document: Document
  let styleElement: HTMLStyleElement

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>')
    document = dom.window.document

    // Load the accessibility.css file
    const cssPath = join(__dirname, '../../src/theme/accessibility.css')
    const cssContent = readFileSync(cssPath, 'utf-8')

    // Add the CSS to the document
    styleElement = document.createElement('style')
    styleElement.textContent = cssContent
    document.head.appendChild(styleElement)
  })

  describe('Touch Target Sizing (Requirements 11.1, 11.2)', () => {
    test('touch-target class has minimum 44px width and height', () => {
      expect(styleElement.textContent).toContain('.touch-target')
      expect(styleElement.textContent).toMatch(/\.touch-target \{[\s\S]*?min-width: 44px/)
      expect(styleElement.textContent).toMatch(/\.touch-target \{[\s\S]*?min-height: 44px/)
    })

    test('touch-target uses flexbox for centering', () => {
      expect(styleElement.textContent).toMatch(/\.touch-target \{[\s\S]*?display: inline-flex/)
      expect(styleElement.textContent).toMatch(/\.touch-target \{[\s\S]*?align-items: center/)
      expect(styleElement.textContent).toMatch(/\.touch-target \{[\s\S]*?justify-content: center/)
    })

    test('all ion-button elements have minimum 44px height', () => {
      expect(styleElement.textContent).toContain('ion-button {')
      expect(styleElement.textContent).toMatch(/ion-button \{[\s\S]*?min-height: 44px/)
    })

    test('small ion-button elements maintain minimum 44px height', () => {
      expect(styleElement.textContent).toContain('ion-button[size="small"]')
      expect(styleElement.textContent).toMatch(/ion-button\[size="small"\] \{[\s\S]*?min-height: 44px/)
    })

    test('icon-only buttons meet minimum 44px dimensions', () => {
      expect(styleElement.textContent).toMatch(/button\[aria-label\]:not\(\[aria-label=""\]\):empty[\s\S]*?min-width: 44px/)
      expect(styleElement.textContent).toMatch(/button\[aria-label\]:not\(\[aria-label=""\]\):empty[\s\S]*?min-height: 44px/)
    })

    test('ion-tab-button has minimum 44px height', () => {
      expect(styleElement.textContent).toContain('ion-tab-button')
      expect(styleElement.textContent).toMatch(/ion-tab-button \{[\s\S]*?min-height: 44px/)
    })

    test('ion-item has minimum 44px height', () => {
      expect(styleElement.textContent).toContain('ion-item')
      expect(styleElement.textContent).toMatch(/ion-item \{[\s\S]*?--min-height: 44px/)
    })

    test('FAB buttons exceed minimum with 56px dimensions', () => {
      expect(styleElement.textContent).toMatch(/\.fab,[\s\S]*?ion-fab-button/)
      expect(styleElement.textContent).toMatch(/min-width: 56px/)
      expect(styleElement.textContent).toMatch(/min-height: 56px/)
    })

    test('navigation items have minimum 44px height', () => {
      expect(styleElement.textContent).toContain('.nav-item')
      expect(styleElement.textContent).toMatch(/\.nav-item \{[\s\S]*?min-height: 44px/)
    })

    test('avatar buttons meet minimum dimensions', () => {
      expect(styleElement.textContent).toContain('.avatar-button')
      expect(styleElement.textContent).toMatch(/\.avatar-button[\s\S]*?min-width: 44px/)
      expect(styleElement.textContent).toMatch(/\.avatar-button[\s\S]*?min-height: 44px/)
    })

    test('close and dismiss buttons meet minimum dimensions', () => {
      expect(styleElement.textContent).toContain('.close-button')
      expect(styleElement.textContent).toContain('.dismiss-button')
      expect(styleElement.textContent).toMatch(/\.close-button[\s\S]*?min-width: 44px/)
      expect(styleElement.textContent).toMatch(/\.close-button[\s\S]*?min-height: 44px/)
    })

    test('segment buttons have minimum 44px height', () => {
      expect(styleElement.textContent).toContain('ion-segment-button')
      expect(styleElement.textContent).toMatch(/ion-segment-button \{[\s\S]*?min-height: 44px/)
    })

    test('toggle switches have minimum 44px height', () => {
      expect(styleElement.textContent).toContain('ion-toggle')
      expect(styleElement.textContent).toMatch(/ion-toggle \{[\s\S]*?min-height: 44px/)
    })

    test('card action buttons meet minimum dimensions', () => {
      expect(styleElement.textContent).toContain('.card-actions ion-button')
      expect(styleElement.textContent).toMatch(/\.card-actions[\s\S]*?min-height: 44px/)
    })

    test('button group items maintain minimum height', () => {
      expect(styleElement.textContent).toContain('.button-group > *')
      expect(styleElement.textContent).toMatch(/\.button-group > \* \{[\s\S]*?min-height: 44px/)
    })
  })

  describe('Touch Target Spacing (Requirement 11.3)', () => {
    test('adjacent touch targets have 8px spacing', () => {
      expect(styleElement.textContent).toContain('.touch-target + .touch-target')
      expect(styleElement.textContent).toMatch(/\.touch-target \+ \.touch-target \{[\s\S]*?margin-left: 8px/)
    })

    test('button groups have 8px gap between items', () => {
      expect(styleElement.textContent).toContain('.button-group')
      expect(styleElement.textContent).toMatch(/\.button-group \{[\s\S]*?gap: 8px/)
    })

    test('form fields have minimum 12px spacing', () => {
      expect(styleElement.textContent).toContain('.form-field + .form-field')
      expect(styleElement.textContent).toMatch(/\.form-field \+ \.form-field \{[\s\S]*?margin-top: 12px/)
    })

    test('ion-item list items have adequate spacing', () => {
      expect(styleElement.textContent).toContain('ion-item + ion-item')
      expect(styleElement.textContent).toMatch(/ion-item \+ ion-item \{[\s\S]*?margin-top: 2px/)
    })

    test('form elements in forms have minimum 12px vertical spacing', () => {
      expect(styleElement.textContent).toMatch(/form > \*:not\(:last-child\) \{[\s\S]*?margin-bottom: 12px/)
    })
  })

  describe('Text Links (Requirement 11.4)', () => {
    test('paragraph links have adequate padding for tap area', () => {
      expect(styleElement.textContent).toContain('p a {')
      expect(styleElement.textContent).toMatch(/p a \{[\s\S]*?padding: 8px 4px/)
    })

    test('paragraph links have minimum 44px height', () => {
      expect(styleElement.textContent).toMatch(/p a \{[\s\S]*?min-height: 44px/)
    })

    test('paragraph links have adequate line-height for vertical tap area', () => {
      expect(styleElement.textContent).toMatch(/p a \{[\s\S]*?line-height: 28px/)
    })

    test('standalone touch links have adequate padding and height', () => {
      expect(styleElement.textContent).toContain('a.touch-link')
      expect(styleElement.textContent).toMatch(/a\.touch-link \{[\s\S]*?padding: 12px 8px/)
      expect(styleElement.textContent).toMatch(/a\.touch-link \{[\s\S]*?min-height: 44px/)
    })
  })

  describe('Form Inputs (Requirements 9.3, 11.1)', () => {
    test('ion-input has minimum 44px height', () => {
      expect(styleElement.textContent).toMatch(/ion-input,[\s\S]*?ion-textarea,[\s\S]*?ion-select/)
      expect(styleElement.textContent).toMatch(/--min-height: 44px/)
    })

    test('standard HTML inputs have minimum 44px height', () => {
      expect(styleElement.textContent).toContain('input:not([type="checkbox"]):not([type="radio"])')
      expect(styleElement.textContent).toMatch(/input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)[\s\S]*?min-height: 44px/)
    })

    test('textarea has minimum 44px height', () => {
      expect(styleElement.textContent).toMatch(/textarea[\s\S]*?min-height: 44px/)
    })

    test('select has minimum 44px height', () => {
      expect(styleElement.textContent).toMatch(/select[\s\S]*?min-height: 44px/)
    })

    test('form inputs have 16px font size to prevent iOS auto-zoom', () => {
      expect(styleElement.textContent).toMatch(/input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)[\s\S]*?font-size: 16px/)
    })

    test('checkbox and radio inputs have adequate click area', () => {
      expect(styleElement.textContent).toContain('input[type="checkbox"]')
      expect(styleElement.textContent).toContain('input[type="radio"]')
      expect(styleElement.textContent).toMatch(/input\[type="checkbox"\][\s\S]*?min-width: 24px/)
      expect(styleElement.textContent).toMatch(/input\[type="checkbox"\][\s\S]*?min-height: 24px/)
    })

    test('checkbox and radio labels have adequate tap area', () => {
      expect(styleElement.textContent).toContain('input[type="checkbox"] + label')
      expect(styleElement.textContent).toContain('input[type="radio"] + label')
      expect(styleElement.textContent).toMatch(/input\[type="checkbox"\] \+ label[\s\S]*?padding: 10px 8px/)
    })
  })

  describe('Mobile-First Approach', () => {
    test('base styles apply without media queries', () => {
      // All touch target rules should be defined without media queries
      const beforeMediaQuery = styleElement.textContent.split('@media')[0]
      
      expect(beforeMediaQuery).toContain('min-width: 44px')
      expect(beforeMediaQuery).toContain('min-height: 44px')
    })

    test('explicit mobile viewport rule ensures 44px minimum', () => {
      expect(styleElement.textContent).toContain('@media (min-width: 320px)')
      expect(styleElement.textContent).toMatch(/@media \(min-width: 320px\)[\s\S]*?min-height: 44px/)
    })

    test('touch target standards apply across all viewports', () => {
      // The mobile-first approach means rules are defined at base level
      // and do not change at larger breakpoints
      const cssContent = styleElement.textContent
      const touchTargetRule = cssContent.match(/\.touch-target \{[\s\S]*?\}/)
      expect(touchTargetRule).toBeTruthy()
    })
  })

  describe('Keyboard Focus States (Requirement 11.1)', () => {
    test('removes default outline for mouse users', () => {
      expect(styleElement.textContent).toContain(':focus:not(:focus-visible)')
      expect(styleElement.textContent).toMatch(/:focus:not\(:focus-visible\) \{[\s\S]*?outline: none/)
    })

    test('visible focus indicator for keyboard navigation', () => {
      expect(styleElement.textContent).toContain(':focus-visible')
      expect(styleElement.textContent).toMatch(/:focus-visible \{[\s\S]*?outline: 2px solid var\(--ion-color-primary\)/)
      expect(styleElement.textContent).toMatch(/:focus-visible \{[\s\S]*?outline-offset: 2px/)
    })

    test('buttons have focus-visible styles', () => {
      expect(styleElement.textContent).toContain('button:focus-visible')
      expect(styleElement.textContent).toContain('ion-button:focus-visible')
    })

    test('links have focus-visible styles', () => {
      expect(styleElement.textContent).toContain('a:focus-visible')
    })

    test('form inputs have focus-visible styles', () => {
      expect(styleElement.textContent).toContain('input:focus-visible')
      expect(styleElement.textContent).toContain('textarea:focus-visible')
      expect(styleElement.textContent).toContain('ion-input:focus-visible')
    })

    test('dark mode adjusts focus indicators', () => {
      expect(styleElement.textContent).toContain('@media (prefers-color-scheme: dark)')
      expect(styleElement.textContent).toMatch(/@media \(prefers-color-scheme: dark\)[\s\S]*?outline-color: var\(--ion-color-primary-tint\)/)
    })

    test('explicit dark mode class support', () => {
      expect(styleElement.textContent).toContain('body.dark :focus-visible')
      expect(styleElement.textContent).toContain('.ion-palette-dark :focus-visible')
    })

    test('all interactive elements have focus styles defined', () => {
      const interactiveElements = [
        'button:focus-visible',
        'a:focus-visible',
        'input:focus-visible',
        'ion-button:focus-visible',
        'ion-tab-button:focus-visible',
        'ion-segment-button:focus-visible',
        'ion-chip:focus-visible',
        'ion-toggle:focus-visible',
        'ion-item:focus-visible',
        '.nav-item:focus-visible',
        'ion-fab-button:focus-visible'
      ]

      interactiveElements.forEach(selector => {
        expect(styleElement.textContent).toContain(selector)
      })
    })
  })

  describe('CSS Structure and Organization', () => {
    test('file includes proper documentation header', () => {
      expect(styleElement.textContent).toContain('Accessibility Standards')
      expect(styleElement.textContent).toContain('Requirements validated: 11.1, 11.2, 11.3, 11.4, 9.3')
    })

    test('sections are organized with clear headers', () => {
      expect(styleElement.textContent).toContain('TOUCH TARGET SIZING')
      expect(styleElement.textContent).toContain('TOUCH TARGET SPACING')
      expect(styleElement.textContent).toContain('BUTTONS')
      expect(styleElement.textContent).toContain('LINKS')
      expect(styleElement.textContent).toContain('FORM INPUTS')
    })

    test('mobile-first approach is documented', () => {
      expect(styleElement.textContent).toContain('mobile-first approach')
    })

    test('includes both Ionic and standard HTML element support', () => {
      // Verify both Ionic components and standard HTML elements are covered
      expect(styleElement.textContent).toContain('ion-button')
      expect(styleElement.textContent).toContain('button')
      expect(styleElement.textContent).toContain('ion-input')
      expect(styleElement.textContent).toContain('input')
    })
  })
})
