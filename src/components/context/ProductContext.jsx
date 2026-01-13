import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const ProductContext = createContext();

const ProductContextProvider = ({ children }) => {
  const [productsData, setProductsData] = useState([]);
  const [colors, setColors] = useState([]);
  const [coordsData, setCoordsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [googleSheetColors, setGoogleSheetColors] = useState([])
  const [styleDetails, setStyleDetails] = useState([]);
  const BASE_URL = "https://fastapi.qurvii.com";

  // product fetching like mrp style_id etc 
  const fetchProducts = async () => {
    const response = await fetch("https://inventorybackend-m1z8.onrender.com/api/product");
    const result = await response.json();
    setProductsData(result);
  }

  // color fetching 
  const fetchColors = async () => {
    const response = await axios.get("https://inventorybackend-m1z8.onrender.com/api/v1/colors/get-colors")
    setColors(response.data.data);
  }

  // get data from orders 
  const getResponseFromOrders = async (orderId) => {
    const response = await axios.post(`${BASE_URL}/scan`, {
      user_id: 715,
      order_id: parseInt(orderId),
      user_location_id: 140,
    });
    const data = response.data.data;
    return data
  };



  const fetchCoordsDataFromGoogleSheet = async () => {
    setLoading(true);

    try {
      const sheetId = "1SIP3Glxo5vkL0Jvx9ulj0p6xZoOh0ruzRtIqzldmb8E";
      const apiKey = "AIzaSyAGjWAyG29vKBgiYVSXCn08cu5ym6FwiQs";
      const range = "co-ords rack!A1:K"; // full columns

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

      const response = await axios.get(url);
      const values = response.data.values;
      if (!values || values.length === 0) {
        setCoordsData([]);
        return;
      }

      // 🧠 Step 1: Headers normalize
      const headers = values[0].map(h =>
        h
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[^a-z0-9]/g, "")
      );

      // 🧠 Step 2: Convert rows → structured JSON
      const formattedData = values.slice(1).map(row => {
        return headers.reduce((obj, key, index) => {
          let value = row[index] ?? null;

          // Type casting
          if ((key === "mrp" || key === "style1" || key === "style2" || key === "coordstyle") && value !== null) {
            // if (key === "mrp"  && value !== null) {
            value = Number(value);
          }

          if (key === "listindividually") {
            value = value === "TRUE" || value === true;
          }

          obj[key] = value;
          return obj;
        }, {});
      });

      setCoordsData(formattedData);
      console.log("Coords Structured Data", formattedData);

    } catch (error) {
      console.error("Failed to fetch coords data :: ", error);
      setError(`Failed to fetch coords data :: ${error?.message}`);
    } finally {
      setLoading(false);
    }
  };


  // *************** fetch colors from google sheet *****************
  const fetchColorsFromGoogleSheet = async () => {
    setLoading(true);

    try {
      const sheetId = "1SIP3Glxo5vkL0Jvx9ulj0p6xZoOh0ruzRtIqzldmb8E";
      const apiKey = "AIzaSyAGjWAyG29vKBgiYVSXCn08cu5ym6FwiQs";
      const range = "sw data!A1:I"; // full columns

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;

      const response = await axios.get(url);
      const values = response.data.values;
      if (!values || values.length === 0) {
        setCoordsData([]);
        return;
      }

      // 🧠 Step 1: Headers normalize
      const headers = values[0].map(h =>
        h
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[^a-z0-9]/g, "")
      );

      // 🧠 Step 2: Convert rows → structured JSON
      const formattedData = values.slice(1).map(row => {
        return headers.reduce((obj, key, index) => {
          let value = row[index] ?? null;
          obj[key] = value;
          return obj;
        }, {});
      });

      setGoogleSheetColors(formattedData);
      console.log("Colors Structured Data", formattedData);

    } catch (error) {
      console.error("Failed to fetch colors data :: ", error);
      setError(`Failed to fetch colors  data :: ${error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchStylesDataFromGoogleSheet = async () => {
    setLoading(true)
    try {
      const sheetId = "1SIP3Glxo5vkL0Jvx9ulj0p6xZoOh0ruzRtIqzldmb8E";
      const apiKey = "AIzaSyAGjWAyG29vKBgiYVSXCn08cu5ym6FwiQs";
      const range = "sw data!A1:F";
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
      const response = await axios.get(url);
      const styles = {};
      for (let i = 0; i < response.data.values.length; i++) {
        const [style_number, style_sketch, line, pattern_number, sleeve_pattern, style_type] = response.data.values[i];
        styles[style_number] = { style_type }
      }
      setStyleDetails(styles);


    } catch (error) {
      console.log("Failed to fetch pattern and mrp data from google sheet error :: ", error);

    }
    finally {

      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
    fetchCoordsDataFromGoogleSheet();
    fetchColorsFromGoogleSheet();
    fetchStylesDataFromGoogleSheet()
    fetchColors();
  }, [])

  return (
    <ProductContext.Provider value={{ productsData, getResponseFromOrders, colors, coordsData, googleSheetColors, styleDetails }}>
      {children}
    </ProductContext.Provider>
  );
};






const useGlobalContext = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a ProductContextProvider");
  }
  return context;
};

export { ProductContextProvider, useGlobalContext };