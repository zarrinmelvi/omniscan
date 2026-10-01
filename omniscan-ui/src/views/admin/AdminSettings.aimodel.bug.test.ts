/**
 * Bug condition exploration test — AI Model field mutability (Item 4)
 *
 * Property 4: Bug Condition — AI Model Field Is Not Mutable
 *
 * CRITICAL BUGFIX SEMANTICS:
 *   - This test MUST FAIL against the UNFIXED AdminSettings.vue.
 *   - A failure CONFIRMS the bug exists:
 *       • The #aiModel input uses `v-model="form.aiModel"`, so every input event
 *         writes the typed value back into form.aiModel (two-way binding).
 *       • There is no `readonly` attribute on the input.
 *   - After the fix (`:value` binding + `readonly` attribute) this test will PASS.
 *   - DO NOT fix the test or the component code here.
 *
 * isBugCondition_Item4(fieldId, userAction):
 *   fieldId = "aiModel" AND userAction = type
 *
 * Validates: Requirements 4.1, 4.2 (bug) → 4.3, 4.4, 4.5 (expected behavior)
 *
 * Counterexample (confirmed on unfixed code — test run 2025):
 *   - "gpt-4"       → form.aiModel changed to "gpt-4";       input.readOnly === false
 *   - "custom-model"→ form.aiModel changed to "custom-model"; input.readOnly === false
 *   - ""            → form.aiModel changed to "";             input.readOnly === false
 *
 * Root cause confirmed:
 *   `v-model="form.aiModel"` binds a native 'input' event listener that writes
 *   every keystroke directly into form.aiModel. The element also lacks the
 *   `readonly` attribute, so the browser imposes no typing restriction either.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AdminSettings from './AdminSettings.vue';

/** Candidate input values that cover the failing input space. */
const CANDIDATE_VALUES = ['gpt-4', 'custom-model', ''];

describe('Property 4: Bug Condition — AI Model Field Is Not Mutable', () => {
	let wrapper: VueWrapper;

	beforeEach(async () => {
		// Prevent real network calls from fetchSettings()
		global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in tests'));
		// Seed localStorage so the dark-mode watcher does not throw
		localStorage.setItem('omniscan_dark_mode', 'false');

		wrapper = mount(AdminSettings, {
			global: {
				stubs: {
					// Stub Ionic router-related components that require a router context
					'ion-page': { template: '<div><slot /></div>' },
					'ion-content': { template: '<div><slot /></div>' },
				},
			},
			attachTo: document.body,
		});

		// Navigate to the AI & Scanning tab so #aiModel is rendered
		const aiTabButton = wrapper
			.findAll('.tab-button')
			.find((btn) => btn.text().includes('AI'));

		expect(aiTabButton, '#aiModel tab button must exist').toBeTruthy();
		await aiTabButton!.trigger('click');
		await wrapper.vm.$nextTick();
	});

	afterEach(() => {
		wrapper.unmount();
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it.each(CANDIDATE_VALUES)(
		'form.aiModel stays "Ollama Pro" and #aiModel is readOnly after typing "%s"',
		async (candidateValue) => {
			const input = wrapper.find<HTMLInputElement>('#aiModel');

			// Precondition: the field must be present in the DOM
			expect(input.exists(), '#aiModel input must be rendered').toBe(true);

			// Simulate a user typing by setting the element value and firing an input event.
			// v-model listens to the native 'input' event to update the reactive form property.
			const inputEl = input.element;
			inputEl.value = candidateValue;
			await input.trigger('input');
			await wrapper.vm.$nextTick();

			// ── Expected behavior (FAILS on unfixed code) ──────────────────────────────
			//
			// 1. form.aiModel MUST remain "Ollama Pro" regardless of what the user types.
			//    On unfixed code: v-model writes candidateValue back → form.aiModel changes.
			//    Counterexample: form.aiModel === candidateValue  (e.g. "gpt-4")
			//
			// 2. The input element MUST have readOnly === true.
			//    On unfixed code: no readonly attribute → readOnly === false.
			//    Counterexample: input.readOnly === false

			// @ts-expect-error — accessing internal reactive state via component instance
			const aiModelValue = (wrapper.vm as { form: { aiModel: string } }).form.aiModel;
			expect(aiModelValue).toBe('Ollama Pro');

			expect(inputEl.readOnly).toBe(true);
		},
	);
});
