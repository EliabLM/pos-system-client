import React from 'react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  SignUpButton,
} from '@clerk/nextjs';

const OnboardingPage = () => {
  return (
    <div>
      <header className="flex justify-end items-center p-4 gap-4 h-16 bg-amber-300">
        <SignedOut>
          <SignInButton />
          <SignUpButton>
            <button className="bg-[#6c47ff] text-white rounded-full font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 cursor-pointer">
              Registrarse
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </header>
      ONBOARDING
    </div>
  );
};

export default OnboardingPage;
