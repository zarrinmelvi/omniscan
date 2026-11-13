export type TermsBlock =
	| { type: 'p'; text: string }
	| { type: 'strong'; text: string }
	| { type: 'ul'; items: string[] }

export interface TermsSection {
	title: string
	blocks: TermsBlock[]
}

export const termsIntro: string[] = [
	'Welcome to OmniScan, a cross-platform pantry management system developed as part of a Bachelor of Science in Information Technology capstone project at STI College San Jose Del Monte.',
	'These Terms and Conditions ("Terms") govern the use of the OmniScan Web Application and Android Mobile Application ("Application" or "System"). By creating an account, accessing, or using OmniScan, you acknowledge that you have read, understood, and agreed to these Terms.',
	'If you do not agree, discontinue use.',
]

export const termsSections: TermsSection[] = [
	{
		title: '1. Purpose of OmniScan',
		blocks: [
			{ type: 'p', text: 'OmniScan is designed to help users make safer and more informed food purchasing, consumption, and household food management decisions.' },
			{ type: 'p', text: 'The Application provides features that may include:' },
			{
				type: 'ul',
				items: [
					'Food product scanning using a mobile device camera;',
					'Image uploading through the web and mobile applications;',
					'Ingredient text extraction and simplification;',
					'Potential allergen detection;',
					'Recognition of selected Halal certification logos;',
					'Dietary profile matching and color-coded safety assessments;',
					'Alternative product recommendations;',
					'Digital pantry management and product categorization;',
					'Expiration and best-before date tracking and notifications;',
					'AI-generated recipe recommendations based on pantry ingredients and dietary preferences; and',
					'Recipe saving, preparation tracking, and ingredient consumption monitoring.',
				],
			},
			{ type: 'p', text: 'OmniScan uses Optical Character Recognition (OCR), computer vision, Artificial Intelligence (AI), and product and ingredient reference databases to provide these features.' },
		],
	},
	{
		title: '2. Eligibility and Account Registration',
		blocks: [
			{ type: 'p', text: 'An account is required to access the personalized features of OmniScan. Registration requires a name, email address, and password, or the use of Google Sign-In.' },
			{ type: 'p', text: 'Users must verify their email address before completing dietary profile setup.' },
			{ type: 'p', text: 'Users agree to:' },
			{
				type: 'ul',
				items: [
					'1) Provide accurate registration information;',
					'2) Keep their account information updated;',
					'3) Keep their login credentials confidential;',
					'4) Not share their account with other persons; and',
					'5) Notify the administrators or support team of any suspected unauthorized access.',
				],
			},
			{ type: 'p', text: 'Users are responsible for all activities that occur under their account.' },
		],
	},
	{
		title: '3. Personalized Dietary Profile',
		blocks: [
			{ type: 'p', text: 'Users may select their food allergens and Halal preference during registration or through the Profile section.' },
			{ type: 'p', text: 'This information serves as the basis for ingredient analysis, allergen identification, Halal assessments, color-coded alerts, and alternative product and recipe recommendations.' },
			{ type: 'p', text: 'Users are responsible for keeping their dietary profile accurate and updated. OmniScan analysis is limited to supported allergens, available ingredient information, and available Halal references, and does not guarantee the identification of every dietary concern.' },
		],
	},
	{
		title: '4. Food Product Scanning and AI Analysis',
		blocks: [
			{ type: 'p', text: 'Users may scan a food product using a device camera or upload an existing product image. OCR, computer vision, and AI analysis are provided through Ollama Cloud.' },
			{ type: 'p', text: 'Analysis results may include simplified ingredients, allergen warnings, Halal information, dietary suitability, color indicators, and alternative product suggestions.' },
			{ type: 'p', text: 'OmniScan uses three color-coded indicators:' },
			{
				type: 'ul',
				items: [
					'Green – Safe: No identified dietary concern based on the available information and registered preferences.',
					'Yellow – Caution: A potential dietary concern, unverified Halal certification, or insufficient information requires further verification.',
					"Red – Unsafe: A detected ingredient or dietary concern conflicts with the user's registered dietary preferences.",
				],
			},
			{ type: 'p', text: 'These indicators are informational and are not guarantees.' },
		],
	},
	{
		title: '5. Food Safety Disclaimer',
		blocks: [
			{ type: 'strong', text: 'OmniScan does not guarantee that a food product is completely safe, allergen-free, Halal-certified, or suitable for every individual.' },
			{ type: 'p', text: 'OmniScan is a decision-support tool and is not a replacement for reading product packaging or consulting professionals.' },
			{ type: 'p', text: 'Users must independently verify:' },
			{
				type: 'ul',
				items: [
					'The original ingredient list;',
					'Allergen declarations and warnings;',
					'Halal certification information;',
					'Expiration and best-before dates; and',
					'Other relevant product information.',
				],
			},
			{ type: 'p', text: 'Users with serious allergies should consult qualified healthcare or dietary professionals.' },
		],
	},
	{
		title: '6. Limitations of Detection and Recognition',
		blocks: [
			{ type: 'p', text: 'OmniScan results depend on image quality, available product information, training data, and reference databases.' },
			{ type: 'p', text: 'Detection is limited to allergens recognized by the World Health Organization (WHO) and selected Halal logos included in its training dataset and reference library.' },
			{ type: 'p', text: 'OmniScan may not fully identify:' },
			{
				type: 'ul',
				items: [
					'Allergens that are not included in its supported WHO references;',
					'All international Halal logos;',
					'Newly released products;',
					'Damaged, missing, unclear, or unreadable labels;',
					'Absent or unrecognized Halal logos; and',
					'Ingredients whose exact composition cannot be determined.',
				],
			},
			{ type: 'p', text: 'Accuracy may be affected by image resolution, lighting, packaging design, text readability, and label completeness.' },
		],
	},
	{
		title: '7. Halal Verification',
		blocks: [
			{
				type: 'ul',
				items: [
					'Halal – A recognized Halal indicator was detected and identified;',
					'Non-Halal – Ingredient information or other indicators suggest a potential non-Halal concern; and',
					'Unknown – The Halal status cannot be sufficiently verified.',
				],
			},
			{ type: 'p', text: 'OmniScan is not an official Halal certification authority and does not issue Halal certifications.' },
			{ type: 'p', text: 'A detected logo does not guarantee current validity, and an Unknown result does not automatically mean the product is non-Halal. Users should verify certification with the appropriate recognized certifying authority.' },
		],
	},
	{
		title: '8. Photo Upload Restrictions',
		blocks: [
			{ type: 'p', text: 'To maintain system performance, the following restrictions apply:' },
			{
				type: 'ul',
				items: [
					'1) A maximum of seven (7) images may be uploaded per day across the web and mobile platforms;',
					'2) A ten (10)-second cooldown applies between uploads;',
					'3) Images must be relevant to food product scanning; and',
					'4) Images must contain sufficiently readable product information.',
				],
			},
			{ type: 'p', text: 'Otherwise, results may be incomplete or inaccurate.' },
		],
	},
	{
		title: '9. Pantry Management and Expiration Tracking',
		blocks: [
			{ type: 'p', text: 'Users may organize products in the Freezer, Fridge, and Cupboard storage locations, and manage quantities, categories, expiration dates, and best-before dates.' },
			{ type: 'p', text: 'Dates are automatically extracted when readable. Otherwise, users must enter them manually.' },
			{ type: 'p', text: 'Expired products may be automatically transferred to the pantry archive. Consumed products must be archived manually by the user. OmniScan does not detect physical consumption.' },
			{ type: 'p', text: 'Users are responsible for checking product dates and keeping their pantry records accurate.' },
		],
	},
	{
		title: '10. Recipe Recommendations and Ingredient Tracking',
		blocks: [
			{ type: 'p', text: 'OmniScan generates AI-powered recipes from the user\'s pantry and registered preferences, providing:' },
			{
				type: 'ul',
				items: [
					'Suggested meals;',
					'Required ingredients;',
					'Cooking instructions;',
					'Recommended ingredient portions; and',
					'Recipe saving and preparation tracking.',
				],
			},
			{ type: 'p', text: 'Selecting "Make Recipe" moves the recipe to the Made Recipes archive, updates ingredient quantities, and moves used ingredients to the pantry archive.' },
			{ type: 'p', text: 'AI-generated recipes are informational and provided for convenience. Users must verify suitability, allergens, Halal compliance, freshness, food handling, and cooking requirements.' },
		],
	},
	{
		title: '11. User-Provided Images and Information',
		blocks: [
			{ type: 'p', text: 'Users agree to:' },
			{
				type: 'ul',
				items: [
					'1) Upload only images and information they have the right to submit;',
					'2) Provide relevant and accurate information;',
					'3) Avoid uploading unnecessary personal, confidential, or sensitive information; and',
					'4) Use the feature only as intended.',
				],
			},
			{ type: 'p', text: 'Uploaded images may be processed for scanning, analysis, and recommendations.' },
		],
	},
	{
		title: '12. Notifications and Reminders',
		blocks: [
			{ type: 'p', text: 'OmniScan may send expiry notifications, dietary warnings, recipe suggestions, account inactivity and deletion warning emails, and other system notifications.' },
			{ type: 'p', text: 'Users can enable or disable expiration and recipe notifications in settings.' },
			{ type: 'p', text: 'Delivery may be affected by connectivity, device settings, email delivery, or other interruptions. Users remain responsible for checking their products and pantry information.' },
		],
	},
	{
		title: '13. Account Inactivity and Deletion',
		blocks: [
			{
				type: 'ul',
				items: [
					'1) Accounts inactive for six (6) months may receive an email notification that the account is scheduled for deletion;',
					'2) Accounts that remain inactive for one (1) additional week after the notification may be permanently deleted; and',
					'3) Deletion follows the applicable account-management procedures.',
				],
			},
			{ type: 'p', text: 'Users must remain active to retain access. Once an account is deleted, its information and personalized features may no longer be available.' },
		],
	},
	{
		title: '14. Acceptable Use',
		blocks: [
			{ type: 'p', text: 'Users agree not to:' },
			{
				type: 'ul',
				items: [
					'1) Use OmniScan for unlawful purposes;',
					'2) Access the accounts of other users;',
					'3) Disrupt the System;',
					'4) Bypass security measures or restrictions;',
					'5) Upload malicious files;',
					'6) Misuse the scanning, upload, or recommendation features;',
					'7) Access administrative functions without authorization; or',
					'8) Harm other users or the operation of OmniScan.',
				],
			},
			{ type: 'p', text: 'Violations may result in suspension or termination of access.' },
		],
	},
	{
		title: '15. System Availability and Technical Requirements',
		blocks: [
			{ type: 'p', text: 'OmniScan is available as a Web Application and an Android Mobile Application, with administrative functions provided through a separate web-based Admin Portal.' },
			{ type: 'p', text: 'Users need a compatible web browser or supported Android device, an active internet connection, and camera permission for mobile scanning. Internet access is required for the backend, database, and AI features.' },
			{ type: 'p', text: 'Uninterrupted availability is not guaranteed and may be affected by maintenance, updates, server or database issues, connectivity problems, or third-party interruptions. The development team may modify, update, suspend, or discontinue features.' },
		],
	},
	{
		title: '16. Accuracy of Information',
		blocks: [
			{ type: 'p', text: 'OmniScan does not guarantee that its information, classifications, recommendations, or alerts are complete, accurate, or current. Product formulations, ingredients, packaging, and Halal information may change.' },
			{ type: 'p', text: 'Users should prioritize the current product packaging and verify information through official sources.' },
		],
	},
	{
		title: '17. Intellectual Property',
		blocks: [
			{ type: 'p', text: 'The OmniScan name, system design, user interface, software components, documentation, and original materials are owned by their respective owners and are subject to applicable intellectual property rights and licenses.' },
			{ type: 'p', text: 'Users may use OmniScan only for its intended purpose.' },
			{ type: 'p', text: 'Unauthorized copying, modification, distribution, reverse engineering, or reproduction is prohibited except where permitted by applicable law or the relevant license.' },
			{ type: 'p', text: 'Third-party software, frameworks, datasets, and services used by OmniScan remain subject to their respective licenses and terms.' },
		],
	},
	{
		title: '18. Third-Party Services and Data Sources',
		blocks: [
			{ type: 'p', text: 'OmniScan may rely on third-party services for:' },
			{
				type: 'ul',
				items: [
					'AI and product analysis;',
					'Cloud hosting and deployment;',
					'Database management;',
					'User authentication;',
					'Email notifications; and',
					'Image processing.',
				],
			},
			{ type: 'p', text: 'Their availability, performance, and accuracy are outside the direct control of the development team.' },
		],
	},
	{
		title: '19. Limitation of Liability',
		blocks: [
			{ type: 'p', text: 'To the extent permitted by law, the OmniScan development team is not responsible for losses, damages, dietary reactions, food-related incidents, or other consequences resulting from sole reliance on the Application\'s outputs.' },
			{ type: 'p', text: 'OmniScan is a decision-support and pantry management tool. It is not a substitute for professional medical, dietary, religious, regulatory, or food-safety advice.' },
			{ type: 'p', text: 'Nothing in these Terms excludes liability that cannot legally be excluded.' },
		],
	},
	{
		title: '20. User Responsibility',
		blocks: [
			{ type: 'p', text: 'Users are responsible for their own food purchasing, preparation, storage, consumption, and dietary decisions.' },
			{ type: 'p', text: 'Users must independently verify product information before buying or consuming food, especially when they have allergies, dietary restrictions, or religious requirements.' },
			{ type: 'p', text: 'Users must keep their profiles, product information, dates, and pantry records accurate.' },
		],
	},
	{
		title: '21. Privacy and Personal Information',
		blocks: [
			{ type: 'p', text: 'OmniScan processes account information, dietary profiles, food images, pantry records, scan history, and other information entered or generated through the Application.' },
			{ type: 'p', text: 'Personal information is handled in accordance with the applicable OmniScan Privacy Policy and data protection requirements. Users are encouraged to review the Privacy Policy.' },
		],
	},
	{
		title: '22. Changes to These Terms',
		blocks: [
			{ type: 'p', text: 'The OmniScan development team may revise these Terms. Updated Terms may be made available through the Application.' },
			{ type: 'p', text: 'Users should review the Terms periodically. Continued use of OmniScan after updates constitutes acknowledgment of the revised Terms.' },
		],
	},
	{
		title: '23. Termination of Access',
		blocks: [
			{ type: 'p', text: 'Access to OmniScan may be suspended or terminated for violations of these Terms, attempts to compromise the System, misuse of the Application, or activities that may cause harm.' },
			{ type: 'p', text: 'Users may discontinue their use of the Application at any time.' },
		],
	},
	{
		title: '24. Contact and Support',
		blocks: [
			{ type: 'p', text: 'Users may contact the OmniScan support team regarding technical issues, concerns, questions, or inquiries through the Contact Support feature available within the Application.' },
		],
	},
	{
		title: '25. Acceptance of Terms',
		blocks: [
			{ type: 'p', text: 'By selecting "I Agree," "Accept," or by proceeding with registration and use, you acknowledge that you:' },
			{
				type: 'ul',
				items: [
					'Have read and understood these Terms & Conditions;',
					'Agree to comply with these Terms;',
					'Understand that OmniScan provides informational and decision-support assistance;',
					'Understand that OmniScan may not identify every allergen, ingredient, or Halal certification;',
					'Acknowledge the limitations of AI analysis and recommendations; and',
					'Agree to independently verify important food information.',
				],
			},
			{ type: 'strong', text: 'If you do not agree to these Terms & Conditions, please do not use OmniScan.' },
		],
	},
]

export const termsFooterLines: string[] = [
	'OmniScan',
	'A Cross-Platform Pantry Manager with Computer Vision for Allergen and Halal Detection and Artificial Intelligence Recommendations',
	'Developed as a Capstone Project',
	'STI College San Jose Del Monte',
	'Bachelor of Science in Information Technology',
]
