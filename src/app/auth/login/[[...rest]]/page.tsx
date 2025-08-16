import { SignIn } from '@clerk/nextjs';

const LoginPage = () => {
  return <SignIn forceRedirectUrl={'/dashboard'} />;
};

export default LoginPage;
