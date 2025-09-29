import React from 'react';
import { SignedIn, UserButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import RegisterOrganizationPage from './features/create-organization';

const OnboardingPage = async () => {
  const user = await currentUser();

  return (
    <div>
      <header className="p-2 flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <h1 className="text-base font-medium">
            {user?.firstName} {user?.lastName}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>

      <RegisterOrganizationPage />
    </div>
  );
};

export default OnboardingPage;
