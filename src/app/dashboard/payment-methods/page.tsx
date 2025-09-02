import React from 'react';
import PaymentMethodList from './features/payment-methods-list';

const CategoriesPage = () => {
  return (
    <div className='flex flex-1 flex-col'>
      <PaymentMethodList />
    </div>
  );
};

export default CategoriesPage;
