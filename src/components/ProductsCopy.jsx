import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import Iframe from "./Iframe";
import { useGlobalContext } from "./context/ProductContext";
import axios from "axios";
import Session from "../components/Session";
const BASE_URL = "https://return-inventory-backend.onrender.com";

const ProductsCopy = () => {
  const productsData = useGlobalContext();
  const [sessionStart, setSessionStart] = useState(false);
  const { getResponseFromOrders, coordsData, googleSheetColors } = useGlobalContext();
  const [ordersRecord, setOrdersRecord] = useState([]);
  const [mappedOrderId, setMappedOrderId] = useState([]);
  const [isInvalid, setIsInvalid] = useState(false);
  const [sessionId, setSessionId] = useState(
    localStorage.getItem("sessionId") || null
  );
  const [products, setProducts] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [autoSubmitOnSizeChange, setAutoSubmitOnSizeChange] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [formData, setFormData] = useState({
    styleNumber: "",
    size: "",
    quantity: 1,
  });

  const { styleDetails } = useGlobalContext();
  console.log("style type", styleDetails)

  const fetchMached = productsData.productsData.find(
    (p) => p.style_code === Number(!orderId ? formData?.styleNumber : ordersRecord?.style_number)
  );

  const fetchMappedOrderIdWithRackSpace = async (STYLE_NUMBER) => {
    try {
      // Parse the style number
      const match = STYLE_NUMBER.match(/(\D*)(\d+)(\D*)/);
      if (!match) {
        setIsInvalid(true);
        return "Not Found";
      }

      const prefix = match[1] || "";
      const number = parseInt(match[2], 10);
      const suffix = match[3] || "";

      // Function to try fetching a specific style number
      const tryFetch = async (styleNum) => {
        try {
          const response = await axios.get(
            `https://raw-material-backend.onrender.com/api/v1/order-id-mapping/get-mapped-style-id?style_number=${styleNum}`
          );

          const data = response.data.data?.data;
          if (data && Object.keys(data).length > 0) {
            return data;
          }
          return null;
        } catch (error) {
          if (error.response && error.response.status === 404) {
            return null;
          }
          console.log(`Error fetching ${styleNum}:`, error.message);
          return null;
        }
      };

      // Try original style number first
      let data = await tryFetch(STYLE_NUMBER);
      if (data) {
        setMappedOrderId(data);
        setIsInvalid(false);
        console.log("data found for original", data);
        return data;
      }

      // Check forward 100 numbers
      for (let i = 1; i <= 100; i++) {
        const forwardNumber = number + i;
        const forwardStyleNumber = `${prefix}${forwardNumber}${suffix}`;

        data = await tryFetch(forwardStyleNumber);
        if (data) {
          setMappedOrderId(data);
          setIsInvalid(false);
          console.log(`data found for ${forwardStyleNumber}`, data);
          return data;
        }
      }

      // Check backward 100 numbers
      for (let i = 1; i <= 100; i++) {
        const backwardNumber = number - i;
        if (backwardNumber < 0) break;

        const backwardStyleNumber = `${prefix}${backwardNumber}${suffix}`;

        data = await tryFetch(backwardStyleNumber);
        if (data) {
          setMappedOrderId(data);
          setIsInvalid(false);
          console.log(`data found for ${backwardStyleNumber}`, data);
          return data;
        }
      }

      // If nothing found
      setIsInvalid(true);
      console.log(`No data found for ${STYLE_NUMBER} and surrounding 200 numbers`);
      return "Not Found";

    } catch (error) {
      setIsInvalid(true);
      console.log("Failed to fetch mapped order id rack details error :: ", error);
      return "Not Found";
    }
  };
  useEffect(() => {
    if (formData.styleNumber?.toString().length >= 5) {
      fetchMappedOrderIdWithRackSpace(formData.styleNumber)
    }
  }, [formData.styleNumber]);

  // ********************* co-ords rackSpace matching logics ************************

  const matchedCoords = coordsData.find((co) => (co.style1 === Number(formData.styleNumber) || co.style1 === Number(ordersRecord?.style_number))
    || (co.style2 === Number(formData.styleNumber) || co.style2 === Number(ordersRecord?.style_number))
    || (co.coordstyle === Number(formData.styleNumber) || co.coordstyle === Number(ordersRecord?.style_number))
  );


  // *************** coords article type matching logics ***********************
  const coordsArticleTypeMatch = (styleNumber) => {
    return googleSheetColors.find((d) => d.stylenumber == styleNumber)?.styletype
  }


  if (matchedCoords) {
    console.log("Matched Coords Data", matchedCoords);
  }
  // finding valid rackSpace

  function getValidRackSpace(startStyleNumber, productsData) {
    const original = parseInt(startStyleNumber);

    // Step 1: Build a lookup map for faster access
    const styleMap = new Map();
    productsData.forEach((p) => {
      styleMap.set(String(p.style_code), p);
    });

    const getCleanRackSpace = (rackSpace) =>
      rackSpace?.replace(/['"]/g, "").trim().toUpperCase();

    // Consider blank or 'DEFAULT' rack as invalid
    const isValidRack = (rackSpace) => {
      const cleaned = getCleanRackSpace(rackSpace);
      return cleaned && cleaned !== "DEFAULT";
    };

    // Step 2: Check current style's rack space
    const current = styleMap.get(String(original));
    if (!current) return null;

    const currentRack = getCleanRackSpace(current.rack_space);

    // Only proceed if style number is 5 digits and rack is invalid
    if (String(original).length === 5 && !isValidRack(current.rack_space)) {
      // Step 3: Try +1 to +100
      for (let i = 1; i <= 100; i++) {
        const next = styleMap.get(String(original + i));
        const rack = getCleanRackSpace(next?.rack_space);
        if (rack && rack !== "DEFAULT") {
          return { rackSpace: next.rack_space, styleNumber: original + i };
        }
      }

      // Step 4: Try -1 to -100
      for (let i = 1; i <= 100; i++) {
        const prev = styleMap.get(String(original - i));
        const rack = getCleanRackSpace(prev?.rack_space);
        if (rack && rack !== "DEFAULT") {
          return { rackSpace: prev.rack_space, styleNumber: original - i };
        }
      }

      // Not found
      console.warn("No valid rack space found within +/-100 range.");
      return null;
    }

    // If current rack is valid
    if (isValidRack(current.rack_space)) {
      return { rackSpace: current.rack_space, styleNumber: original };
    }

    return null;
  }





  const [editingIndex, setEditingIndex] = useState(null); // Track which product is being edited
  const styleNumberRef = useRef(null);
  const sizeRef = useRef(null);
  useEffect(() => {
    styleNumberRef.current.focus();
    const savedProducts = localStorage.getItem("products");
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

  const result = getValidRackSpace(
    ordersRecord?.style_number
      ? ordersRecord?.style_number
      : formData?.styleNumber,
    productsData.productsData
  );


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
        return
      }

      // delete matched orderId
      try {
        if (!matched?.order_id) {
          throw new Error("Order id required");
        }

        const deleteMatchedOrderid = await axios.post(`${BASE_URL}/api/v1/ship-record/ship`, {

          order_id: matched?.order_id,

        });

        if (deleteMatchedOrderid) {
          console.log("Matched record Moved to ship successfully", matched);
        }
      } catch (error) {
        console.log("Failed to move in ship:", error?.response?.data || error.message);
      }

    } catch (error) {
      console.log("Failed to delete matched order id", error?.response?.data || error.message);
    }
  };



  const handleSubmit = (e) => {
    e.preventDefault();

    const baseStyleNumber =
      formData?.styleNumber?.trim() || ordersRecord?.style_number;

    const size =
      formData?.size?.trim() || ordersRecord?.size;

    const quantity = parseInt(formData.quantity) || 0;

    const rackSpace =
      matchedCoords?.rackspace ||
      mappedOrderId[0]?.rack_space ||
      "Not found";

    const commonPayload = {
      size,
      quantity,
      dateAdded: new Date().toISOString(),
      rackSpace,
      orderId: orderId || "-",
      parentStyleNumber: matchedCoords ? matchedCoords.coordstyle : null,
    };

    let newProducts = [];

    /** CASE 1: Co-ords style → add both child styles */
    const isCoordsStyle =
      baseStyleNumber?.toString().startsWith("30") &&
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
    }
    /** CASE 2: Normal single style */
    else {
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

    localStorage.setItem("products", JSON.stringify(updatedProducts));
    setProducts(updatedProducts);

    fetchOrderIdAndDeleteRecordFromPressTable();

    setFormData({ styleNumber: "", size: "", quantity: 1 });
    setMappedOrderId([])
    styleNumberRef.current.focus();
  };

  const handleEdit = (index) => {
    const productToEdit = products[index];
    setFormData({
      styleNumber: productToEdit.styleNumber,
      size: productToEdit.size,
      quantity: productToEdit.quantity.toString(),
    });
    setEditingIndex(index); // Set which product we're editing
    window.scrollTo({ top: 0, behavior: "smooth" });
    styleNumberRef.current.focus();
  };

  const handleDelete = (index) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      const updatedProducts = products.filter((_, i) => i !== index);
      setProducts(updatedProducts);
      localStorage.setItem("products", JSON.stringify(updatedProducts));
      // If we're deleting the product being edited, reset the form
      if (editingIndex === index) {
        setFormData({ styleNumber: "", size: "", quantity: 1 });
        setEditingIndex(null);
      }
    }
  };




  useEffect(() => {
    if (
      (autoSubmitOnSizeChange && formData.size) ||
      (autoSubmitOnSizeChange && ordersRecord?.ordersRecord.size)
    ) {
      handleSubmit({ preventDefault: () => { } });
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
          // Don't clear orderId here
        } catch (error) {
          console.error("Failed to fetch or process order", error);
        }
      }
    };

    autoFetch();
  }, [orderId]);

  const scanAndAddProduct = (e) => {
    e.preventDefault();
    if (!ordersRecord || Object.keys(ordersRecord).length === 0) {
      // Don't submit if no order record is loaded
      return;
    }
    handleSubmit({ preventDefault: () => { } });
    setOrdersRecord({});
    setOrderId("");
    qrIdRef.current.focus();
  };


  return (
    <div className="max-w-4xl p-6 bg-white rounded-lg">
      <Session
        products={products}
        setProducts={setProducts}
        setSessionStart={setSessionStart}
      />
      <div
        className={`bg-yellow-200 py-2 rounded mb-4 px-2 tracking-tight 
          
        `}
      >
        <marquee behavior="alternate" direction="alternative">
          {" "}
          Select a size and the product will be added automatically.{" "}
        </marquee>
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {editingIndex !== null ? "Edit Product" : "Add New Product"}
      </h2>

      <div className={`bg-gray-50 py-2 px-4 rounded shadow mb-4 `}>

        <div className="flex items-center gap-4 flex-wrap">


          {/* Input and Button Group */}
          <form onSubmit={scanAndAddProduct}>
            <div className="flex flex-wrap items-center gap-3">
              {/* Order ID Input */}
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
        className={`  absolute right-4 -top-48 overflow-hidden 2xl:w-auto xl:w-200 lg:w-115 md:w-115`}
      >
        <Iframe style_id={fetchMached?.style_id} />
      </div>

      <form onSubmit={scanAndAddProduct}>
        <div className="flex  md:w-85 lg:w-100 2xl:w-full xl:w-100 xs:w-90  flex-col gap-4">
          {/* Style Number */}
          <div className="flex-1">
            <div className="flex justify-end">
              <span
                className={`${mappedOrderId[0]?.rack_space ? "block" : "hidden"
                  } bg-yellow-200 py-2 px-4 rounded-full mb-2 `}
              >
                Rack Space: {mappedOrderId[0]?.rack_space ? mappedOrderId[0]?.rack_space : "Not found"}
              </span>
            </div>
            <label
              htmlFor="styleNumber"
              className=" text-sm font-medium text-gray-700 items-center mb-2  flex justify-between"
            >
              Style Number *  : <h2 className="font-bold text-green-800 bg-green-200 p-2 rounded-md shadow "> Total Added Products : {products.length}</h2>
              <div className="flex gap-2 items-center">
                {(formData.styleNumber?.toString().length === 5 || ordersRecord?.style_number?.toString().length === 5) && (
                  <p className="py-3 px-4 bg-red-100 text-red-900 rounded font-bold ">  {styleDetails[(formData.styleNumber) || (ordersRecord?.style_number)]?.style_type} </p>
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
              className="w-full  px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Style #"
            />
          </div>
          {/* ********************* coords split logics ************************ */}
          {(ordersRecord?.style_number?.toString().startsWith("30") && ordersRecord?.style_number?.toString()?.length === 5 || formData?.styleNumber?.toString().startsWith("30") && formData?.styleNumber?.toString()?.length === 5) && (
            <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded">
              {/* <div> <input type="checkbox" name="" id="" /> </div> */}
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

          {
            mappedOrderId[0]?.rack_space && (
              <Select
                ref={sizeRef}
                isDisabled={!sessionStart}
                options={[
                  { label: "XXS", value: "XXS" },
                  { label: "XS", value: "XS" },
                  { label: "S", value: "S" },
                  { label: "M", value: "M" },
                  { label: "L", value: "L" },
                  { label: "XL", value: "XL" },
                  { label: "2XL", value: "2XL" },
                  { label: "3XL", value: "3XL" },
                  { label: "4XL", value: "4XL" },
                  { label: "5XL", value: "5XL" },
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
                    maxHeight: "none",
                  }),
                  menuList: (provided) => ({
                    ...provided,
                    maxHeight: "none",
                  }),
                }}
              />
            )
          }



          {/* Quantity */}
          <div className="flex-1 ">
            <label
              htmlFor="quantity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
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
              className="w-full   px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="Qty"
            />
          </div>

          {/* Add button */}
          <div className={`${orderId ? "block" : "hidden"} flex-1 `}>
            <input
              type="submit"
              disabled={!sessionStart && !orderId}
              name="quantity"
              value="Add"
              onChange={handleChange}
              required
              min="1"
              className={`w-full   px-4 py-2 border border-gray-300 rounded-md focus:ring-2 bg-[#222] text-white font-medium cursor-pointer hover:bg-[#333] outline-none transition ${!orderId ? "cursor-not-allowed" : "cursor-pointer"}`}
              placeholder="Qty"
            />
          </div>
        </div>
      </form>

      <hr className="my-4 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent border-0" />

      {/* Saved Products List */}
      {products.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Saved Products
          </h3>
          <div className="space-y-2 lg:w-100 2xl:w-full xl:w-100 md:w-90">
            {products.map((product, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-3 rounded-md hover:bg-gray-100 transition-colors ${editingIndex === index ? "bg-blue-50" : "bg-gray-50"
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
