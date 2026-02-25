import React, { useState, useEffect } from 'react';
import ProductsCopy from './ProductsCopy';
import UploadRackSpace from './UploadRackSpace';

const InventoryPage = () => {
  const [localStorageData, setLocalStorageData] = useState({});
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('racks')) || {};
    setLocalStorageData(data);
  }, []);
  console.log(localStorageData);
  return <div>{localStorageData['12027'] ? <ProductsCopy /> : <UploadRackSpace />}</div>;
};

export default InventoryPage;
