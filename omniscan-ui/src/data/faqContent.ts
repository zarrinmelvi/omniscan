export interface FaqItem {
	q: string
	a: string
	list?: string[]
	outro?: string
}

export const faqs: FaqItem[] = [
	{
		q: 'What is OmniScan?',
		a: 'OmniScan is a cross-platform pantry management system that uses Artificial Intelligence (AI), computer vision, and Optical Character Recognition (OCR) to analyze food products, identify potential allergens, recognize selected Halal certification logos, and simplify ingredient information. It also provides digital pantry management, expiration tracking, and personalized recipe recommendations.',
	},
	{
		q: 'How does OmniScan work?',
		a: "Users can scan food product labels using their mobile device camera or upload an existing product image through the web or mobile application. The System processes the image to extract ingredient information, recognize selected Halal certification logos, and evaluate the product according to the user's registered dietary profile. It then provides simplified ingredient information, color-coded safety assessments, and alternative product recommendations when applicable.",
	},
	{
		q: 'What allergens can OmniScan detect?',
		a: "OmniScan detects allergens officially recognized by the World Health Organization (WHO) that are supported by its allergen reference data. The System compares the extracted ingredient information against its available allergen references and the user's registered allergy profile. However, it may not identify allergens that are outside its supported database or cannot be reliably extracted from the product label.",
	},
	{
		q: 'Can I customize my dietary preferences?',
		a: 'Yes. During registration, users can select their food allergens and specify their Halal preference. These settings can also be updated through the Profile section. The System uses this information to personalize product assessments, dietary alerts, and recipe recommendations.',
	},
	{
		q: "How does OmniScan's Halal detection work?",
		a: 'OmniScan uses computer vision to recognize selected Halal certification logos included in its training dataset and reference library. It also analyzes available ingredient information to identify potential Halal-related concerns. Results may be classified as Halal, Non-Halal, or Unknown. However, OmniScan is not an official Halal certification authority, and users should verify certification information through the appropriate recognized certifying body when necessary.',
	},
	{
		q: 'What do the color-coded safety alerts mean?',
		a: 'OmniScan uses three color-coded indicators to present product assessment results:',
		list: [
			'Green – Safe: No identified dietary concern based on the available information and registered preferences.',
			'Yellow – Caution: A potential dietary concern, unverified Halal certification, or insufficient information requires further checking.',
			"Red – Unsafe: A detected ingredient or dietary concern conflicts with the user's registered dietary preferences.",
		],
		outro: 'These indicators are AI-assisted assessments and should not replace checking the original product label.',
	},
	{
		q: 'Does OmniScan recommend alternative products?',
		a: "Yes. When potential dietary concerns are identified, OmniScan may suggest alternative food products based on available product information and the user's dietary profile. These recommendations are intended to help users identify other options that may better match their registered dietary preferences.",
	},
	{
		q: 'Can I upload an existing product image instead of scanning it?',
		a: 'Yes. Users can either scan a product directly using their device camera or select an existing product photograph from their device gallery. Both options allow the System to analyze available product information and provide dietary assessments.',
	},
	{
		q: 'Is there a limit to the number of photos I can upload?',
		a: 'Yes. OmniScan allows a maximum of seven (7) photo uploads per day across the web and mobile platforms. A ten (10)-second cooldown is also implemented between uploads.',
	},
	{
		q: 'Can OmniScan automatically detect expiration dates?',
		a: 'Yes. OmniScan can automatically extract expiration or best-before dates when they are available and clearly readable from the product label. If the date cannot be extracted or is unclear, users must manually enter the correct date before adding the product to their pantry.',
	},
	{
		q: 'How does the digital pantry work?',
		a: 'The digital pantry allows users to organize their stored food products according to storage locations, such as the freezer, fridge, and cupboard. Users can also manage product categories, quantities, and expiration dates. This feature helps users monitor their available food items and maintain an organized household inventory.',
	},
	{
		q: 'What happens when a product expires or is consumed?',
		a: 'Expired products are automatically transferred to the pantry archive. Products that have already been consumed must be manually archived by the user. OmniScan does not automatically detect when a product has been physically consumed or removed from the pantry.',
	},
	{
		q: 'How does the recipe recommendation feature work?',
		a: "OmniScan generates AI-powered recipe suggestions based on the ingredients available in the user's digital pantry and their registered dietary preferences. Recommended recipes include required ingredients, cooking instructions, and suggested ingredient portions to help users prepare meals using available food items.",
	},
	{
		q: 'Can I save recipes or track meals I have prepared?',
		a: 'Yes. Users can like and save their preferred recipes for easier access in the future. When users select the "Make Recipe" feature, the prepared recipe is transferred to the Made Recipes archive. The System also updates the corresponding ingredient quantities and records used ingredients in the pantry archive.',
	},
	{
		q: 'Does OmniScan require an internet connection?',
		a: "Yes. An active internet connection is required to access OmniScan's web services, backend, database, and AI-powered functionalities. Internet access is also necessary for product analysis, accessing stored information, and receiving system updates and notifications.",
	},
	{
		q: 'What devices and platforms support OmniScan?',
		a: 'OmniScan supports two user access platforms:',
		list: [
			'Web Application: Accessible through compatible web browsers, such as Google Chrome and Safari.',
			'Android Mobile Application: Designed for supported Android devices.',
		],
		outro: 'The System also provides a separate web-based Admin Portal for authorized administrators.',
	},
	{
		q: 'Why does OmniScan require camera permission?',
		a: 'Camera permission is required when users want to scan food product labels directly through the Android Mobile Application. This allows the System to capture product images for ingredient extraction, Halal logo recognition, and dietary assessment. Users who prefer not to use the camera may upload an existing product image instead.',
	},
	{
		q: 'Why might OmniScan produce an inaccurate or incomplete result?',
		a: 'The accuracy of OmniScan depends on image quality, label readability, available product information, training data, and reference database coverage. Products with damaged, unclear, missing, or incomplete labels may not be fully recognized. The System may also have difficulty identifying newly released products, unsupported allergens, or Halal certifications that are not included in its reference library.',
	},
	{
		q: 'What happens if my account remains inactive?',
		a: 'OmniScan monitors account activity for account-management purposes. Accounts that remain inactive for six (6) months may receive an email notification informing the user that the account is scheduled for deletion. If the account remains inactive for one (1) additional week after the notification is sent, it may be permanently deleted.',
	},
	{
		q: 'Is my personal information protected?',
		a: 'OmniScan processes account information, dietary profiles, pantry records, scan history, and other information necessary to provide its features. The handling of personal information is subject to the applicable OmniScan Privacy Policy and relevant data protection requirements. Users are encouraged to review the Privacy Policy for more information about personal information handling.',
	},
	{
		q: 'Where can I report technical issues or ask for assistance?',
		a: "Users may contact the OmniScan support team through the Contact Support feature available in the Application. This feature can be used to submit technical concerns, report system issues, or request assistance regarding the application's functionality.",
	},
]
