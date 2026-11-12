export interface FaqItem {
	q: string
	a: string
}

export const faqs: FaqItem[] = [
	{
		q: 'What is OmniScan?',
		a: 'OmniScan is a smart pantry management system that uses Artificial Intelligence and computer vision to scan food products, detect allergens, verify Halal certification, and provide personalized food recommendations.',
	},
	{
		q: 'How does OmniScan work?',
		a: 'Users can scan food packaging using their device camera or upload an image. The system analyzes the product using computer vision and OCR to extract ingredient information, detect allergens, and recognize Halal certification logos.',
	},
	{
		q: 'What allergens can the system detect?',
		a: 'OmniScan can detect common allergens such as milk, eggs, peanuts, tree nuts, soy, wheat, fish, and shellfish. Additionally, users can customize their dietary profile by adding other allergies or ingredient sensitivities.',
	},
	{
		q: 'Can I add my own dietary restrictions?',
		a: 'Yes. The system includes a personalized dietary profile where users can add allergies, dietary restrictions (e.g., Halal, vegetarian, vegan), health conditions, and nutritional preferences.',
	},
	{
		q: 'How does the Halal detection feature work?',
		a: 'The system identifies authorized Halal certification logos from food packaging and verifies them using a stored database of recognized certification marks.',
	},
	{
		q: 'Does OmniScan suggest food or recipes?',
		a: 'Yes. OmniScan provides AI-powered recommendations, including safer alternative products and recipe suggestions based on the ingredients available in your pantry and your dietary profile.',
	},
	{
		q: 'Can OmniScan track expiration dates?',
		a: 'Yes. The system monitors expiration dates of stored products and notifies users when items are near expiration to help reduce food waste.',
	},
	{
		q: 'Is an internet connection required?',
		a: 'Some features, such as AI recommendations and database updates, may require an internet connection, while basic scanning functions may still work with limited offline capability depending on the system design.',
	},
	{
		q: 'Is my personal data safe?',
		a: 'Yes. OmniScan is designed to protect user data. Personal information and dietary profiles are securely stored and used only to provide personalized system features and recommendations.',
	},
	{
		q: 'Who can use OmniScan?',
		a: 'OmniScan is designed for anyone, especially individuals with food allergies, dietary restrictions, health conditions, or those who want to make safer and more informed food choices.',
	},
]
