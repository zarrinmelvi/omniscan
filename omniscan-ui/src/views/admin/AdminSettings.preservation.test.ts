/**
 * Preservation property tests — Non-aiModel fields and save payload (Task 2)
 *
 * Property 5: Preservation — Non-aiModel Fields Continue to Accept Input,
 *             and the Save Payload Always Includes aiModel
 *
 * OBSERVATION-FIRST methodology:
 *   These tests observe the behavior of the UNFIXED code for inputs where
 *   `isBugCondition_Item4` returns FALSE (fieldId ≠ "aiModel"), and encode
 *   those observations as (scoped) property-based tests.
 *
 *   EXPECTED OUTCOME on unfixed code: ALL tests PASS (baseline to preserve).
 *
 * isBugCondition_Item4(fieldId, userAction):
 *   fieldId = "aiModel" AND userAction = type
 *
 * Inputs where the bug condition does NOT hold (covered here):
 *   - portalName    (text input, v-model two-way binding)
 *   - emailOnNewFlag, emailOnSystemError, dailySummaryReport (toggle checkboxes)
 *   - enableVisionScan, autoReviewLowRisk                    (toggle checkboxes)
 *   - reviewConfidenceThreshold, autoFlagThreshold           (number inputs)
 *   - Save flow: PUT payload MUST include aiModel: "Ollama Pro" (Req 3.7)
 *
 * Validates: Requirements 3.6, 3.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import AdminSettings from './AdminSettings.vue';

// ───────────────────────────────────────────────────────────────────────────
// Shared mount helper
// ───────────────────────────────────────────────────────────────────────────

async function mountAdminSettings(): Promise<VueWrapper> {
	// Stub fetch so fetchSettings() fails silently (the component's catch block
	// swallows the error and keeps form defaults — which is what we want here).
	global.fetch = vi.fn().mockRejectedValue(new Error('network disabled in tests')) as unknown as typeof fetch;

	// Seed localStorage so the dark-mode watcher doesn't throw.
	localStorage.setItem('omniscan_dark_mode', 'false');

	const wrapper = mount(AdminSettings, {
		global: {
			stubs: {
				'ion-page': { template: '<div><slot /></div>' },
				'ion-content': { template: '<div><slot /></div>' },
			},
		},
		attachTo: document.body,
	});

	// Wait for onMounted + the rejected fetchSettings() to settle.
	await wrapper.vm.$nextTick();
	await new Promise((r) => setTimeout(r, 0));

	return wrapper;
}

// ───────────────────────────────────────────────────────────────────────────
// A. Preservation — text inputs and number inputs accept user input (Req 3.6)
// ───────────────────────────────────────────────────────────────────────────

describe('Property 5A: Preservation — text + number inputs accept user input', () => {
	let wrapper: VueWrapper;

	beforeEach(async () => {
		wrapper = await mountAdminSettings();
	});

	afterEach(() => {
		wrapper.unmount();
		localStorage.clear();
		vi.restoreAllMocks();
	});

	// Generator: representative (fieldId, newValue, tabName) tuples where
	// isBugCondition_Item4 is FALSE (fieldId ≠ "aiModel").
	const textInputCases: { label: string; inputId: string; tab: 'general' | 'ai'; newValue: string } [] = [
		{ label: 'portalName on General tab', inputId: '#portalName', tab: 'general', newValue: 'Renamed Portal' },
		{ label: 'portalName — different value', inputId: '#portalName', tab: 'general', newValue: 'My Custom Portal' },
		{ label: 'reviewConfidenceThreshold on AI tab', inputId: '#reviewThreshold', tab: 'ai', newValue: '60' },
		{ label: 'autoFlagThreshold on AI tab', inputId: '#autoFlagThreshold', tab: 'ai', newValue: '95' },
	];

	it.each(textInputCases)(
		'$label — input event updates the form binding [$label]',
		async ({ inputId, tab, newValue }) => {
			// Navigate to the correct tab if needed.
			if (tab === 'ai') {
				const aiTab = wrapper.findAll('.tab-button').find((btn) => btn.text().includes('AI'));
				expect(aiTab, 'AI tab button must exist').toBeTruthy();
				await aiTab!.trigger('click');
				await wrapper.vm.$nextTick();
			}

			const input = wrapper.find<HTMLInputElement>(inputId);
			expect(input.exists(), `${inputId} must be rendered`).toBe(true);

			// Simulate typing: set native value, fire the input event that v-model listens to.
			input.element.value = newValue;
			await input.trigger('input');
			await wrapper.vm.$nextTick();

			// Preservation (Req 3.6): the form field MUST reflect the new value.
			const vm = wrapper.vm as unknown as { form: Record<string, unknown> };
			const field = inputId.replace('#', '');
			// Map input IDs to the form property name.
			const fieldMap: Record<string, string> = {
				portalName: 'portalName',
				reviewThreshold: 'reviewConfidenceThreshold',
				autoFlagThreshold: 'autoFlagThreshold',
			};
			const formKey = fieldMap[field] ?? field;
			// For number inputs, vitest receives a string from the DOM; cast via form property type.
			const rawValue = vm.form[formKey];
			// v-model.number coerces to number; compare as number when the form value is a number.
			if (typeof rawValue === 'number') {
				expect(rawValue).toBe(Number(newValue));
			} else {
				expect(rawValue).toBe(newValue);
			}
		},
	);
});

// ───────────────────────────────────────────────────────────────────────────
// B. Preservation — toggle checkboxes update their form bindings (Req 3.6)
// ───────────────────────────────────────────────────────────────────────────

describe('Property 5B: Preservation — toggle checkboxes update form bindings', () => {
	let wrapper: VueWrapper;

	beforeEach(async () => {
		wrapper = await mountAdminSettings();
	});

	afterEach(() => {
		wrapper.unmount();
		localStorage.clear();
		vi.restoreAllMocks();
	});

	/**
	 * Generator: one entry per toggle where isBugCondition_Item4 is FALSE.
	 * Each entry captures: the tab to navigate to, the checkbox selector
	 * (nth-of-type within .toggle-switch inputs), the form key, and the expected
	 * default value so we can assert a flip.
	 */
	const toggleCases: {
		label: string;
		tab: 'general' | 'ai' | 'notifications';
		formKey: string;
		defaultValue: boolean;
	}[] = [
		// General tab
		{ label: 'darkMode (General)', tab: 'general', formKey: 'darkMode', defaultValue: false },

		// AI tab
		{ label: 'enableVisionScan (AI)', tab: 'ai', formKey: 'enableVisionScan', defaultValue: true },
		{ label: 'autoReviewLowRisk (AI)', tab: 'ai', formKey: 'autoReviewLowRisk', defaultValue: false },

		// Notifications tab
		{ label: 'emailOnNewFlag (Notifications)', tab: 'notifications', formKey: 'emailOnNewFlag', defaultValue: true },
		{ label: 'emailOnSystemError (Notifications)', tab: 'notifications', formKey: 'emailOnSystemError', defaultValue: true },
		{ label: 'dailySummaryReport (Notifications)', tab: 'notifications', formKey: 'dailySummaryReport', defaultValue: true },
	];

	it.each(toggleCases)(
		'$label — checkbox change event flips form.$formKey',
		async ({ tab, formKey, defaultValue }) => {
			// Navigate to the right tab.
			const tabLabel = tab === 'general' ? 'General' : tab === 'ai' ? 'AI' : 'Notifications';
			const tabBtn = wrapper.findAll('.tab-button').find((btn) => btn.text().includes(tabLabel));
			expect(tabBtn, `${tabLabel} tab button must exist`).toBeTruthy();
			await tabBtn!.trigger('click');
			await wrapper.vm.$nextTick();

			const vm = wrapper.vm as unknown as { form: Record<string, boolean> };

			// Precondition: confirm the default value matches our expectation.
			expect(vm.form[formKey]).toBe(defaultValue);

			// Find the checkbox input inside the toggle switch for this form key.
			// Each .toggle-switch contains exactly one <input type="checkbox">.
			// We locate it by traversing the rendered toggles on the active tab.
			const checkboxes = wrapper.findAll<HTMLInputElement>('.toggle-switch input[type="checkbox"]');
			expect(checkboxes.length).toBeGreaterThan(0);

			// Select the checkbox whose v-model corresponds to formKey by checking
			// which one, when changed, flips form[formKey]. Since the tab renders
			// only the relevant toggles, we iterate and find the one that works.
			let foundCheckbox = false;
			for (const checkbox of checkboxes) {
				// Flip the checkbox value.
				const prevValue = vm.form[formKey];
				checkbox.element.checked = !checkbox.element.checked;
				await checkbox.trigger('change');
				await wrapper.vm.$nextTick();

				if (vm.form[formKey] !== prevValue) {
					foundCheckbox = true;
					// Preservation (Req 3.6): the form field MUST have flipped.
					expect(vm.form[formKey]).toBe(!defaultValue);
					break;
				}
				// Undo the unrelated checkbox flip before moving on.
				checkbox.element.checked = !checkbox.element.checked;
				await checkbox.trigger('change');
				await wrapper.vm.$nextTick();
			}

			expect(foundCheckbox, `No checkbox found that binds to form.${formKey}`).toBe(true);
		},
	);
});

// ───────────────────────────────────────────────────────────────────────────
// C. Preservation — PUT payload always includes aiModel: "Ollama Pro" (Req 3.7)
// ───────────────────────────────────────────────────────────────────────────

describe('Property 5C: Preservation — save payload includes aiModel "Ollama Pro"', () => {
	let wrapper: VueWrapper;
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		// First call (GET /api/admin/settings): fail silently so defaults are kept.
		// Second call (PUT /api/admin/settings): succeed so handleSave() doesn't throw.
		fetchMock = vi.fn()
			.mockRejectedValueOnce(new Error('network disabled — GET'))
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				}),
			);
		global.fetch = fetchMock as unknown as typeof fetch;
		localStorage.setItem('omniscan_dark_mode', 'false');

		wrapper = mount(AdminSettings, {
			global: {
				stubs: {
					'ion-page': { template: '<div><slot /></div>' },
					'ion-content': { template: '<div><slot /></div>' },
				},
			},
			attachTo: document.body,
		});

		await wrapper.vm.$nextTick();
		await new Promise((r) => setTimeout(r, 0));
	});

	afterEach(() => {
		wrapper.unmount();
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it('PUT payload includes aiModel: "Ollama Pro" when no changes are made', async () => {
		// Trigger the save by clicking the Save Changes button.
		const saveButton = wrapper.find('.save-button');
		expect(saveButton.exists(), 'Save button must be present').toBe(true);

		await saveButton.trigger('click');
		await wrapper.vm.$nextTick();
		await new Promise((r) => setTimeout(r, 0));

		// Find the PUT call (second fetch call — the first was the failing GET).
		const putCall = fetchMock.mock.calls.find(
			(call) => {
				const opts = call[1] as RequestInit | undefined;
				return opts?.method === 'PUT';
			},
		);

		expect(putCall, 'A PUT request must have been made on save').toBeTruthy();

		// Parse the body that was sent.
		const body = JSON.parse((putCall![1] as RequestInit).body as string) as Record<string, unknown>;

		// Preservation (Req 3.7): aiModel MUST be present in the payload.
		expect(body).toHaveProperty('aiModel');
		// Preservation (Req 3.7): aiModel value MUST be "Ollama Pro" (the default,
		// unchanged because we never touched the field).
		expect(body.aiModel).toBe('Ollama Pro');
	});

	it('PUT payload includes aiModel: "Ollama Pro" even after editing other fields', async () => {
		// Edit portalName (which IS editable) to confirm other changes don't affect aiModel.
		const portalNameInput = wrapper.find<HTMLInputElement>('#portalName');
		expect(portalNameInput.exists(), '#portalName must be present').toBe(true);

		portalNameInput.element.value = 'Edited Portal Name';
		await portalNameInput.trigger('input');
		await wrapper.vm.$nextTick();

		const saveButton = wrapper.find('.save-button');
		await saveButton.trigger('click');
		await wrapper.vm.$nextTick();
		await new Promise((r) => setTimeout(r, 0));

		const putCall = fetchMock.mock.calls.find(
			(call) => {
				const opts = call[1] as RequestInit | undefined;
				return opts?.method === 'PUT';
			},
		);

		expect(putCall, 'A PUT request must have been made on save').toBeTruthy();

		const body = JSON.parse((putCall![1] as RequestInit).body as string) as Record<string, unknown>;

		// The edited field IS in the payload and changed.
		expect(body.portalName).toBe('Edited Portal Name');

		// Preservation (Req 3.7): aiModel is still "Ollama Pro" regardless of other edits.
		expect(body.aiModel).toBe('Ollama Pro');
	});
});
