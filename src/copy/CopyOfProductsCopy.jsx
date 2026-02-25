import React, { useState, useEffect, useRef } from 'react';
import Select from 'react-select';
import Iframe from './Iframe';
import { useGlobalContext } from './context/ProductContext';
import axios from 'axios';
import Session from '../components/Session';
const BASE_URL = 'https://return-inventory-backend.onrender.com';

const ProductsCopy = () => {
  const productsData = useGlobalContext();
  const [sessionStart, setSessionStart] = useState(false);
  const [localStorageData, setLocalStorageData] = useState({});
  const [selectedRack, setSelectedRack] = useState('');
  const { getResponseFromOrders, coordsData, googleSheetColors } = useGlobalContext();
  const [ordersRecord, setOrdersRecord] = useState([]);
  const [mappedOrderId, setMappedOrderId] = useState([]);
  const [isInvalid, setIsInvalid] = useState(false);
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId') || null);
  const [products, setProducts] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [autoSubmitOnSizeChange, setAutoSubmitOnSizeChange] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [autoSelectRack, setAutoSelectRack] = useState(() => {
    // Load autoSelectRack preference from localStorage
    const saved = localStorage.getItem('autoSelectRack');
    return saved ? JSON.parse(saved) : false;
  });
  const [formData, setFormData] = useState({
    styleNumber: '',
    size: '',
    quantity: 1,
  });

  const { styleDetails } = useGlobalContext();

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('racks')) || {};
    setLocalStorageData(data);
  }, []);

  // Save autoSelectRack preference to localStorage
  useEffect(() => {
    localStorage.setItem('autoSelectRack', JSON.stringify(autoSelectRack));
  }, [autoSelectRack]);

  console.log('localstorage data', localStorageData);

  const fetchMached = productsData.productsData.find(
    (p) => p.style_code === Number(!orderId ? formData?.styleNumber : ordersRecord?.style_number)
  );

  // ********************* co-ords rackSpace matching logics ************************
  const matchedCoords = coordsData.find(
    (co) =>
      co.style1 === Number(formData.styleNumber) ||
      co.style1 === Number(ordersRecord?.style_number) ||
      co.style2 === Number(formData.styleNumber) ||
      co.style2 === Number(ordersRecord?.style_number) ||
      co.coordstyle === Number(formData.styleNumber) ||
      co.coordstyle === Number(ordersRecord?.style_number)
  );

  // *************** coords article type matching logics ***********************
  const coordsArticleTypeMatch = (styleNumber) => {
    return googleSheetColors.find((d) => d.stylenumber == styleNumber)?.styletype;
  };

  if (matchedCoords) {
    console.log('Matched Coords Data', matchedCoords);
  }

  const [editingIndex, setEditingIndex] = useState(null);
  const styleNumberRef = useRef(null);
  const sizeRef = useRef(null);

  useEffect(() => {
    styleNumberRef.current.focus();
    const savedProducts = localStorage.getItem('products');
    if (savedProducts) {
      setProducts(JSON.parse(savedProducts));
    }
  }, []);

  useEffect(() => {
    if (formData.styleNumber.length === 5) {
      setIsMenuOpen(true);
      sizeRef.current?.focus();
    }
  }, [formData?.styleNumber]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ********************* Auto Rack Space Selection Logic ************************
  const getAutoSelectedRack = (styleNumber) => {
    const styleNumStr = styleNumber?.toString();
    if (!styleNumStr) return 'Not found';

    const invalidRacks = ['default', "'default", 'virtual', "'virtual", ''];

    // Check if style exists in localStorage
    const styleRacks = localStorageData[styleNumStr];

    if (!styleRacks || Object.keys(styleRacks).length === 0) {
      // Style not found, search forward and backward
      return findNearestValidRack(styleNumStr);
    }

    // Filter out invalid racks
    const validRacks = Object.entries(styleRacks)
      .filter(([rack]) => !invalidRacks.includes(rack.toLowerCase()))
      .sort(([, stockA], [, stockB]) => stockB - stockA); // Sort by highest stock

    if (validRacks.length === 0) {
      // No valid racks found, search forward and backward
      return findNearestValidRack(styleNumStr);
    }

    // If only one valid rack exists, auto-select it
    if (validRacks.length === 1) {
      return validRacks[0][0];
    }

    // If multiple racks exist, select the one with highest stock
    return validRacks[0][0];
  };

  const findNearestValidRack = (styleNumber) => {
    const styleNum = parseInt(styleNumber);
    const invalidRacks = ['default', "'default", 'virtual', "'virtual", ''];

    // Search forward (1 to 100)
    for (let i = 1; i <= 100; i++) {
      const forwardStyle = (styleNum + i).toString();
      const forwardRacks = localStorageData[forwardStyle];

      if (forwardRacks) {
        const validForwardRacks = Object.entries(forwardRacks)
          .filter(([rack]) => !invalidRacks.includes(rack.toLowerCase()))
          .sort(([, stockA], [, stockB]) => stockB - stockA);

        if (validForwardRacks.length > 0) {
          return validForwardRacks[0][0];
        }
      }
    }

    // Search backward (1 to 100)
    for (let i = 1; i <= 100; i++) {
      const backwardStyle = (styleNum - i).toString();
      const backwardRacks = localStorageData[backwardStyle];

      if (backwardRacks) {
        const validBackwardRacks = Object.entries(backwardRacks)
          .filter(([rack]) => !invalidRacks.includes(rack.toLowerCase()))
          .sort(([, stockA], [, stockB]) => stockB - stockA);

        if (validBackwardRacks.length > 0) {
          return validBackwardRacks[0][0];
        }
      }
    }

    // No valid rack found in forward/backward search
    return 'Not found';
  };

  // Update selectedRack when styleNumber changes
  useEffect(() => {
    const styleNum = orderId ? ordersRecord?.style_number : formData.styleNumber;
    if (styleNum) {
      if (autoSelectRack) {
        // Auto-select highest stock rack
        const autoRack = getAutoSelectedRack(styleNum);
        setSelectedRack(autoRack);
      } else {
        // Don't auto-select, keep current selection or empty
        // Only update if no rack is selected yet
        if (!selectedRack) {
          const autoRack = getAutoSelectedRack(styleNum);
          setSelectedRack(autoRack);
        }
      }
    }
  }, [formData.styleNumber, ordersRecord?.style_number, localStorageData, autoSelectRack]);

  const fetchOrderIdAndDeleteRecordFromPressTable = async () => {
    try {
      const findOrderId = await axios.get(`${BASE_URL}/api/v1/press-table/get-records`);
      const data = findOrderId.data.data;

      const matched = data.find(
        (p) =>
          (Number(formData.styleNumber) === p.styleNumber && formData.size === p.size) ||
          (ordersRecord?.size === p.size && Number(ordersRecord?.style_number) === p.styleNumber)
      );

      if (data.length === 0) {
        return;
      }

      // delete matched orderId
      try {
        if (!matched?.order_id) {
          throw new Error('Order id required');
        }

        const deleteMatchedOrderid = await axios.post(`${BASE_URL}/api/v1/ship-record/ship`, {
          order_id: matched?.order_id,
        });

        if (deleteMatchedOrderid) {
          console.log('Matched record Moved to ship successfully', matched);
        }
      } catch (error) {
        console.log('Failed to move in ship:', error?.response?.data || error.message);
      }
    } catch (error) {
      console.log('Failed to delete matched order id', error?.response?.data || error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const baseStyleNumber = formData?.styleNumber?.trim() || ordersRecord?.style_number;
    const size = formData?.size?.trim() || ordersRecord?.size;
    const quantity = parseInt(formData.quantity) || 0;

    // Use auto-selected rack if autoSelectRack is enabled, otherwise use selected rack
    let rackSpace;
    if (autoSelectRack) {
      rackSpace = matchedCoords?.rackspace || getAutoSelectedRack(baseStyleNumber);
    } else {
      rackSpace = matchedCoords?.rackspace || selectedRack || 'Not found';
    }

    const commonPayload = {
      size,
      quantity,
      dateAdded: new Date().toISOString(),
      rackSpace,
      orderId: orderId || '-',
      parentStyleNumber: matchedCoords ? matchedCoords.coordstyle : null,
    };

    let newProducts = [];

    /** CASE 1: Co-ords style → add both child styles */
    const isCoordsStyle =
      baseStyleNumber?.toString().startsWith('30') &&
      baseStyleNumber?.toString().length === 5 &&
      matchedCoords?.style1 &&
      matchedCoords?.style2;

    if (isCoordsStyle) {
      newProducts = [
        {
          styleNumber: matchedCoords.style1,
          ...commonPayload,
        },
        {
          styleNumber: matchedCoords.style2,
          ...commonPayload,
        },
      ];
    } else {
      /** CASE 2: Normal single style */
      newProducts = [
        {
          styleNumber: baseStyleNumber,
          ...commonPayload,
        },
      ];
    }

    let updatedProducts;

    if (editingIndex !== null) {
      updatedProducts = [...products];
      updatedProducts.splice(editingIndex, 1, ...newProducts);
      setEditingIndex(null);
    } else {
      updatedProducts = [...newProducts, ...products];
    }

    localStorage.setItem('products', JSON.stringify(updatedProducts));
    setProducts(updatedProducts);

    fetchOrderIdAndDeleteRecordFromPressTable();

    setFormData({ styleNumber: '', size: '', quantity: 1 });
    setSelectedRack('');
    styleNumberRef.current.focus();
  };

  const handleEdit = (index) => {
    const productToEdit = products[index];
    setFormData({
      styleNumber: productToEdit.styleNumber,
      size: productToEdit.size,
      quantity: productToEdit.quantity.toString(),
    });
    setEditingIndex(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    styleNumberRef.current.focus();
  };

  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const updatedProducts = products.filter((_, i) => i !== index);
      setProducts(updatedProducts);
      localStorage.setItem('products', JSON.stringify(updatedProducts));
      if (editingIndex === index) {
        setFormData({ styleNumber: '', size: '', quantity: 1 });
        setEditingIndex(null);
      }
    }
  };

  useEffect(() => {
    if (
      (autoSubmitOnSizeChange && formData.size) ||
      (autoSubmitOnSizeChange && ordersRecord?.ordersRecord.size)
    ) {
      handleSubmit({ preventDefault: () => {} });
      setAutoSubmitOnSizeChange(false);
    }
  }, [formData?.size, autoSubmitOnSizeChange]);

  const qrIdRef = useRef(null);

  // ****************************// after 26-07-2025 code ************************

  useEffect(() => {
    const autoFetch = async () => {
      if (orderId?.length === 5 || orderId?.length === 6) {
        try {
          const response = await getResponseFromOrders(Number(orderId));
          styleNumberRef.current.focus();
          styleNumberRef.current.select();
          setOrdersRecord(response);
        } catch (error) {
          console.error('Failed to fetch or process order', error);
        }
      }
    };

    autoFetch();
  }, [orderId]);

  const scanAndAddProduct = (e) => {
    e.preventDefault();
    if (!ordersRecord || Object.keys(ordersRecord).length === 0) {
      return;
    }
    handleSubmit({ preventDefault: () => {} });
    setOrdersRecord({});
    setOrderId('');
    qrIdRef.current.focus();
  };

  // Function to check if rack is valid (not in invalid list)
  const isValidRack = (rack) => {
    const invalidRacks = ['default', "'default", 'virtual', "'virtual", ''];
    return !invalidRacks.includes(rack?.toLowerCase());
  };

  // Function to handle manual rack selection
  const handleManualRackSelect = (rackSpace) => {
    setSelectedRack(rackSpace);
    if (styleNumberRef.current) {
      styleNumberRef.current.focus();
      styleNumberRef.current.select();

      const currentStyleNumber = formData.styleNumber;

      if (currentStyleNumber && currentStyleNumber.length >= 5) {
        const withoutLastDigit = currentStyleNumber.slice(0, -1);
        const lastDigit = currentStyleNumber.slice(-1);

        setTimeout(() => {
          if (setFormData) {
            setFormData((prev) => ({
              ...prev,
              styleNumber: withoutLastDigit,
            }));
          }

          setTimeout(() => {
            if (setFormData) {
              setFormData((prev) => ({
                ...prev,
                styleNumber: withoutLastDigit + lastDigit,
              }));
            }

            if (styleNumberRef.current) {
              styleNumberRef.current.focus();
              styleNumberRef.current.select();
            }
          }, 15);
        }, 10);
      }
    }

    if (setFormData) {
      setFormData((prev) => ({ ...prev, rackSpace: rackSpace }));
    }
  };

  return (
    <div className="max-w-4xl p-6 bg-white rounded-lg">
      <Session products={products} setProducts={setProducts} setSessionStart={setSessionStart} />
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        {editingIndex !== null ? 'Edit Product' : ''}
      </h2>
      <div className={`bg-gray-50 py-2 px-4 rounded shadow mb-4 `}>
        <div className="flex items-center gap-4 flex-wrap">
          <form onSubmit={scanAndAddProduct}>
            <div className="flex flex-wrap items-center gap-3">
              <input
                onChange={(e) => setOrderId(e.target.value)}
                value={orderId}
                ref={qrIdRef}
                type="number"
                disabled={!sessionStart}
                placeholder="Scan order ID..."
                className={`border border-gray-300 rounded-md py-2 px-4 
        outline-none focus:ring-2 focus:ring-blue-500 
        disabled:bg-gray-100 disabled:cursor-not-allowed
        w-64 sm:w-72 md:w-80 lg:w-96`}
              />
            </div>
          </form>
        </div>
      </div>

      <div
        className={`absolute right-4 -top-48 overflow-hidden 2xl:w-auto xl:w-200 lg:w-115 md:w-115`}
      >
        <Iframe style_id={fetchMached?.style_id} />
      </div>

      <form onSubmit={scanAndAddProduct}>
        <div className="flex md:w-85 lg:w-100 2xl:w-full xl:w-100 xs:w-90 flex-col gap-4">
          {/* Style Number */}
          <div className="flex-1">
            {localStorageData[formData.styleNumber] && (
              <div className="mt-6">
                {/* Auto Select Rack Checkbox */}
                <div className="mb-4 flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={autoSelectRack}
                        onChange={(e) => {
                          setAutoSelectRack(e.target.checked);
                          // If turning off auto-select, clear selected rack
                          if (!e.target.checked && selectedRack) {
                            const styleNum = orderId
                              ? ordersRecord?.style_number
                              : formData.styleNumber;
                            const highestStockRack = getAutoSelectedRack(styleNum);
                            if (selectedRack === highestStockRack) {
                              setSelectedRack('');
                            }
                          }
                        }}
                        className="sr-only"
                      />
                      <div
                        className={`block w-14 h-8 rounded-full ${autoSelectRack ? 'bg-green-500' : 'bg-gray-300'}`}
                      ></div>
                      <div
                        className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${autoSelectRack ? 'transform translate-x-6' : ''}`}
                      ></div>
                    </div>
                    <div className="ml-3 text-gray-700 font-medium">
                      Auto Select Rack (Highest Stock)
                    </div>
                  </label>
                  <div className="ml-4 text-sm text-gray-500">
                    {autoSelectRack
                      ? '✓ Auto-selecting highest stock rack'
                      : '✗ Manual rack selection'}
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  {Object.entries(localStorageData[formData.styleNumber])
                    .sort(([, stockA], [, stockB]) => stockB - stockA)
                    .map(([rackSpace, stock]) => (
                      <button
                        key={rackSpace}
                        type="button"
                        onClick={() => {
                          if (!autoSelectRack) {
                            handleManualRackSelect(rackSpace);
                          }
                        }}
                        disabled={autoSelectRack}
                        className={`
                col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3 xl:col-span-2
                px-2 py-2 rounded-lg transition-colors duration-150 text-xs
                flex items-center justify-center gap-2 cursor-pointer
                ${autoSelectRack ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${
                  selectedRack === rackSpace
                    ? 'bg-green-100 text-green-900'
                    : isValidRack(rackSpace)
                      ? 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                      : 'bg-red-50 text-red-800 hover:bg-red-100'
                }
              `}
                      >
                        <span className="font-medium">{rackSpace}</span>
                        <span
                          className={`
                font-bold border-2 rounded-full w-6 h-6 flex justify-center items-center
                ${
                  selectedRack === rackSpace
                    ? 'text-green-900 border-green-600'
                    : isValidRack(rackSpace)
                      ? stock > 0
                        ? 'text-green-600 border-green-600'
                        : 'text-red-500 border-red-500'
                      : 'text-red-500 border-red-500'
                }
              `}
                        >
                          {stock}
                        </span>
                      </button>
                    ))}
                </div>

                {/* Current Selection Status */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Current Mode: </span>
                      <span
                        className={`font-bold ${autoSelectRack ? 'text-green-600' : 'text-blue-600'}`}
                      >
                        {autoSelectRack ? 'AUTO-SELECT' : 'MANUAL SELECT'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Selected Rack: </span>
                      <span className="font-bold text-gray-800">
                        {selectedRack || 'None'}
                        {autoSelectRack && selectedRack && (
                          <span className="ml-2 text-xs text-green-600">(Auto-selected)</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(selectedRack || matchedCoords?.rackSpace) && (
              <div className="flex justify-end">
                <span
                  className={`${
                    matchedCoords?.rack_space || selectedRack ? 'block' : 'hidden'
                  } bg-yellow-200 py-2 px-4 rounded-full mb-2 `}
                >
                  Rack Space:{' '}
                  {matchedCoords?.rackSpace
                    ? matchedCoords?.rackSpace
                    : selectedRack
                      ? selectedRack
                      : 'Not found'}
                  {autoSelectRack && selectedRack && ' (Auto)'}
                </span>
              </div>
            )}

            <label
              htmlFor="styleNumber"
              className="text-sm font-medium text-gray-700 items-center mb-2 flex justify-between"
            >
              Style Number * :{' '}
              <h2 className="font-bold text-green-800 bg-green-200 p-2 rounded-md shadow">
                Total Added Products : {products.length}
              </h2>
              <div className="flex gap-2 items-center">
                {(formData.styleNumber?.toString().length === 5 ||
                  ordersRecord?.style_number?.toString().length === 5) && (
                  <p className="py-3 px-4 bg-red-100 text-red-900 rounded font-bold">
                    {styleDetails[formData.styleNumber || ordersRecord?.style_number]?.style_type}
                  </p>
                )}
              </div>
            </label>

            <input
              ref={styleNumberRef}
              type="text"
              id="styleNumber"
              name="styleNumber"
              disabled={!sessionStart}
              value={
                ordersRecord?.style_number
                  ? Number(ordersRecord.style_number.toString().trim())
                  : formData.styleNumber
              }
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Style #"
            />
          </div>

          {/* ********************* coords split logics ************************ */}
          {((ordersRecord?.style_number?.toString().startsWith('30') &&
            ordersRecord?.style_number?.toString()?.length === 5) ||
            (formData?.styleNumber?.toString().startsWith('30') &&
              formData?.styleNumber?.toString()?.length === 5)) && (
            <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="grid grid-cols-3 gap-1">
                <p>Style 1 : {matchedCoords.style1}</p>
                <p>Rack Space : {matchedCoords.rackspace}</p>
                <p>Article Type : {coordsArticleTypeMatch(matchedCoords?.style1)}</p>
                <p>Style 2 : {matchedCoords.style2}</p>
                <p>Rack Space : {matchedCoords.rackspace}</p>
                <p>Article Type : {coordsArticleTypeMatch(matchedCoords?.style2)}</p>
              </div>
            </div>
          )}

          {(selectedRack || matchedCoords?.rackspace) && (
            <Select
              ref={sizeRef}
              isDisabled={!sessionStart}
              options={[
                { label: 'XXS', value: 'XXS' },
                { label: 'XS', value: 'XS' },
                { label: 'S', value: 'S' },
                { label: 'M', value: 'M' },
                { label: 'L', value: 'L' },
                { label: 'XL', value: 'XL' },
                { label: '2XL', value: '2XL' },
                { label: '3XL', value: '3XL' },
                { label: '4XL', value: '4XL' },
                { label: '5XL', value: '5XL' },
              ]}
              menuIsOpen={isMenuOpen}
              onMenuClose={() => setIsMenuOpen(false)}
              value={
                formData.size
                  ? { label: formData.size, value: formData.size }
                  : ordersRecord?.size
                    ? { label: ordersRecord.size, value: ordersRecord.size }
                    : null
              }
              onChange={(selectedOption) => {
                setFormData((prev) => ({
                  ...prev,
                  size: selectedOption.value,
                }));
                setAutoSubmitOnSizeChange(true);
              }}
              styles={{
                menu: (provided) => ({
                  ...provided,
                  maxHeight: 'none',
                }),
                menuList: (provided) => ({
                  ...provided,
                  maxHeight: 'none',
                }),
              }}
            />
          )}

          {/* Quantity */}
          <div className="flex-1">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              type="number"
              id="quantity"
              disabled={!sessionStart}
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Qty"
            />
          </div>

          {/* Add button */}
          <div className={`${orderId ? 'block' : 'hidden'} flex-1`}>
            <input
              type="submit"
              disabled={!sessionStart && !orderId}
              name="quantity"
              value="Add"
              onChange={handleChange}
              required
              min="1"
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 bg-[#222] text-white font-medium cursor-pointer hover:bg-[#333] outline-none transition ${!orderId ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              placeholder="Qty"
            />
          </div>
        </div>
      </form>

      <hr className="my-4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent border-0" />

      {/* Saved Products List */}
      {products.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Saved Products</h3>
          <div className="space-y-2 lg:w-100 2xl:w-full xl:w-100 md:w-90">
            {products.map((product, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-3 rounded-md hover:bg-gray-100 transition-colors ${
                  editingIndex === index ? 'bg-blue-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex-1 font-medium">{product.orderId}</div>
                <div className="flex-1 font-medium">{product.styleNumber}</div>
                <div className="flex-1">{product.size}</div>
                <div className="flex-1">{product.quantity}</div>
                <div className="flex-1">{product.rackSpace}</div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(index)}
                    className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                    title="Edit"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    className="p-2 text-red-600 hover:text-red-800 transition-colors"
                    title="Delete"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsCopy;
