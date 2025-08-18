'use client';

import { Button } from '@/components/ui/button';
import { useLogin } from '@/hooks/auth/useLogin';

import RegisterUserPage from './steps/register-user';
import RegisterOrganizationPage from './steps/register-organization';
import RegisterStorePage from './steps/register-store';

const getStepContent = (step: number) => {
  switch (step) {
    case 0:
      return <RegisterUserPage />;
    case 1:
      return <RegisterOrganizationPage />;
    case 2:
      return <RegisterStorePage />;
  }
};

export function RegisterForm() {
  const { stepIndex, handleBack, handleNext } = useLogin();

  // Formulario principal de registro
  return (
    <div>
      {getStepContent(stepIndex)}

      {/* <Button onClick={handleNext}>Siguiente</Button> */}
      <Button onClick={handleBack}>Volver</Button>
    </div>
  );
}
