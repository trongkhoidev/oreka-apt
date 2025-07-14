import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const ListAddressPage: React.FC = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/listaddress/1');
  }, [router]);
  return null;
};

export default ListAddressPage; 