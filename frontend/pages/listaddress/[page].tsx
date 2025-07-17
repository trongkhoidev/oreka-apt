import React, { useEffect } from 'react';
import ListAddressOwner from '../../src/components/ListAddressOwner';

const ListAddressPage: React.FC = () => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('allMarketsCache');
    }
  }, []);
  return <ListAddressOwner />;
};

export default ListAddressPage; 