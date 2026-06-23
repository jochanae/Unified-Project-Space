/**
 * Trusted Financial Resources for CoinsBloom
 * External resources organized by category
 */

export interface ExternalResource {
  id: string;
  name: string;
  description: string;
  url: string;
  category: 'taxes' | 'debt_credit' | 'legal' | 'education';
  icon?: string;
}

export const trustedResources: ExternalResource[] = [
  // Taxes
  {
    id: 'hrblock',
    name: 'H&R Block',
    description: 'Tax preparation and filing services',
    url: 'https://www.hrblock.com',
    category: 'taxes',
  },
  {
    id: 'jackson-hewitt',
    name: 'Jackson Hewitt',
    description: 'Tax preparation for individuals and families',
    url: 'https://www.jacksonhewitt.com',
    category: 'taxes',
  },
  {
    id: 'turbotax',
    name: 'TurboTax',
    description: 'Online tax preparation software',
    url: 'https://turbotax.intuit.com',
    category: 'taxes',
  },
  
  // Debt & Credit Support
  {
    id: 'national-debt-relief',
    name: 'National Debt Relief',
    description: 'Debt settlement and negotiation services',
    url: 'https://www.nationaldebtrelief.com',
    category: 'debt_credit',
  },
  {
    id: 'greenpath',
    name: 'GreenPath Financial Wellness',
    description: 'Nonprofit credit counseling and debt management',
    url: 'https://www.greenpath.com',
    category: 'debt_credit',
  },
  {
    id: 'credit-org',
    name: 'Credit.org',
    description: 'Nonprofit credit counseling services',
    url: 'https://www.credit.org',
    category: 'debt_credit',
  },
  
  // Legal & Financial Protection
  {
    id: 'legalshield',
    name: 'LegalShield',
    description: 'Affordable legal protection plans',
    url: 'https://www.legalshield.com',
    category: 'legal',
  },
  {
    id: 'rocket-lawyer',
    name: 'Rocket Lawyer',
    description: 'Online legal services and documents',
    url: 'https://www.rocketlawyer.com',
    category: 'legal',
  },
  {
    id: 'nolo',
    name: 'Nolo',
    description: 'Legal information and DIY legal solutions',
    url: 'https://www.nolo.com',
    category: 'legal',
  },
];

export const educationalResources: ExternalResource[] = [
  {
    id: 'irs',
    name: 'IRS Free File',
    description: 'Free tax preparation and filing from the IRS',
    url: 'https://www.irs.gov/filing/free-file-do-your-federal-taxes-for-free',
    category: 'education',
  },
  {
    id: 'cfpb',
    name: 'Consumer Financial Protection Bureau',
    description: 'Financial education and consumer protection',
    url: 'https://www.consumerfinance.gov',
    category: 'education',
  },
  {
    id: 'ssa',
    name: 'Social Security Administration',
    description: 'Benefits information and retirement planning',
    url: 'https://www.ssa.gov',
    category: 'education',
  },
  {
    id: 'mymoney',
    name: 'MyMoney.gov',
    description: 'Federal financial literacy resources',
    url: 'https://www.mymoney.gov',
    category: 'education',
  },
  {
    id: 'annualcreditreport',
    name: 'AnnualCreditReport.com',
    description: 'Free annual credit reports from all bureaus',
    url: 'https://www.annualcreditreport.com',
    category: 'education',
  },
];

export const resourceCategories = {
  taxes: {
    label: 'Taxes',
    emoji: '🧾',
    description: 'Tax preparation and filing services',
  },
  debt_credit: {
    label: 'Debt & Credit Support',
    emoji: '💳',
    description: 'Help with debt management and credit improvement',
  },
  legal: {
    label: 'Legal & Financial Protection',
    emoji: '⚖️',
    description: 'Legal services and financial protection',
  },
  education: {
    label: 'Educational Resources',
    emoji: '📚',
    description: 'Learn before making important financial decisions',
  },
};
