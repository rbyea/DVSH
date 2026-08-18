import {
  offerContent,
  personalDataConsentContent,
  privacyPolicyContent,
} from '@/shared/config/legalContent';

import { LegalDocumentPage } from './LegalDocumentPage';

export function PrivacyPolicyPage() {
  return (
    <LegalDocumentPage
      sections={privacyPolicyContent.sections}
      title={privacyPolicyContent.title}
      updatedAt={privacyPolicyContent.updatedAt}
    />
  );
}

export function PersonalDataConsentPage() {
  return (
    <LegalDocumentPage
      sections={personalDataConsentContent.sections}
      title={personalDataConsentContent.title}
      updatedAt={personalDataConsentContent.updatedAt}
    />
  );
}

export function OfferPage() {
  return (
    <LegalDocumentPage
      sections={offerContent.sections}
      title={offerContent.title}
      updatedAt={offerContent.updatedAt}
    />
  );
}
