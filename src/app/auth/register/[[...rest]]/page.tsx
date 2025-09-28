import { SignUp } from '@clerk/nextjs';
import { RegisterForm } from './register-form';

const RegisterPage = () => {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <SignUp />
    </div>
  );
};

export default RegisterPage;
