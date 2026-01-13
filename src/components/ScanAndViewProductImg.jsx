import React, { useEffect, useState } from "react";

const ScanAndViewProductImg = () => {
  const [product, setProduct] = useState([]);
  const [styleNumber, setStyleNumber] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFetchProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(
        `https://inventorybackend-m1z8.onrender.com/api/product?style_code=${styleNumber}`
      );
      const data = await response.json();
      setProduct(data[0])
    } catch (error) {
      console.log("Failed to fetch prodcut details.");
    } finally {
      setLoading(false);
    }

  };
  const viewProduct = ()=>{
        window.open(`https://www.myntra.com/coats/qurvii/title/${product?.style_id}/buy`)
    }

  return (
    <div className="container max-w-xl mx-auto mt-10">
      {loading ? (
        <p>Loading... </p>
      ) : (
        <>
          <h2>Style Number with Style ID</h2>
          <input
            onChange={(e) => {
              setStyleNumber(e.target.value);
            }}
            type="number"
            placeholder="Scan | Enter style number."
            className="w-70 border outline-blue-100 mt-3 border-gray-200 py-2 px-4 rounded "
          />

          <button
            onClick={handleFetchProduct}
            className="border border-gray-200 py-2 px-4 font-medium cursor-pointer outline-blue-100 hover:bg-gray-100 ease-in duration-75"
          >
            Search
          </button>
          <div className={`${product?.style_id?"block":"hidden"} bg-blue-100 mt-5 p-4 rounded-2xl shadow text-blue-900`}>
            <p>Style Number : {product.style_code}</p>
            <p>Style Id :{product.style_id} </p>
            <button
            onClick={viewProduct}
            className="bg-blue-300 p-2 mt-2 rounded  cursor-pointer hover:bg-blue-400 duration-75">View Product</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ScanAndViewProductImg;
