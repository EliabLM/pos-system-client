import React from 'react';
import CustomersList from './features/customers-list';

const CustomersPage = () => {
  return (
    <div className="flex flex-1 flex-col">
      <CustomersList />
    </div>
  );
};

export default CustomersPage;
