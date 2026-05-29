import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Account');
  return { title: t('pageTitle') };
}

export default async function AccountPage() {
  return (
    <div className="container py-8">
      {/* <ProfileForm /> */}
      {/* <AddressList /> */}
      {/* <ChangePasswordForm /> */}
    </div>
  );
}
