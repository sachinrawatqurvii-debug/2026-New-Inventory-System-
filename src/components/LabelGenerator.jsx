import React, { useState } from "react";
import { jsPDF } from "jspdf";
import JsBarcode from "jsbarcode";
import html2canvas from "html2canvas";
import {FaTag } from "react-icons/fa";

const LabelGenerator = () => {
  const [products, setProducts] = useState([]);
  const [isGenerating,setIsGenerating] = useState(false);
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
  
      // Detect delimiter (comma or tab)
      const delimiter = content.includes("\t") ? "\t" : ",";
      const lines = content.trim().split("\n");
      const headers = lines[0].split(delimiter);
  
      if (headers.length < 10) {
        alert("CSV format seems invalid. Please check your columns.");
        return;
      }
  
      const data = lines.slice(1).map((line) => {
        const fields = line.split(delimiter);
        return {
          labelType: fields[0]?.trim(),
          sku: fields[1]?.trim(),
          name: fields[2]?.trim(),
          brand: fields[3]?.trim(),
          color: fields[4]?.trim(),
          size: fields[5]?.trim(),
          unit: fields[6]?.trim(),
          mrp: fields[7]?.trim(),
          quantity: parseInt(fields[8]) || 1,
          customText: fields[9]?.trim() || "",
        };
      });
  
      setProducts(data.filter(p => p.sku));
    };
    reader.readAsText(file);
  };
  

  // exporting label 

  const exportToPDF = async () => {
    
    try{
      setIsGenerating(true)
    
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [100, 50],
    });
  
    const barcodeCache = new Map();
  
    const generateBarcodeImage = (sku) => {
      if (barcodeCache.has(sku)) return barcodeCache.get(sku);
  
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, sku, {
        format: "CODE128",
        width: 2,
        height: 30,
        displayValue: false,
      });
      const dataUrl = canvas.toDataURL("image/png");
      barcodeCache.set(sku, dataUrl);
      return dataUrl;
    };
  
    let isFirstPage = true;
  
    for (const product of products) {
      const barcodeImg = generateBarcodeImage(product.sku);
  
      for (let i = 0; i < product.quantity; i++) {
        if (!isFirstPage) pdf.addPage();
        isFirstPage = false;
  
        let y = 10; // Initial Y position
  
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
  
        const nameLines = pdf.splitTextToSize(product.name, 90);
        pdf.text(nameLines, 4, y);
        y += nameLines.length * 5;
  
        pdf.setFont("helvetica", "normal");
        pdf.text(`Brand: ${product.brand}`, 4, y);
        y += 5;
        pdf.text(`Color: ${product.color} | Size: ${product.size} `, 4, y) ;
        y += 5;
        pdf.text(`MRP: Rs.${Number(product.mrp)} | Unit: ${product.unit}`, 4, y);
        y += 5;
  
        if (product.customText) {
          const customLines = pdf.splitTextToSize(product.customText, 90);
          pdf.text(customLines, 4, y);
          y += customLines.length * 5;
        }
  
        const skuText = `Seller SKU: ${product.sku.split("-")[0]}-${product.color}-${product.sku.split("-")[1]}`;
        const skuLines = pdf.splitTextToSize(skuText, 90);
        pdf.text(skuLines, 4, y);
        y += skuLines.length * 5;
  
        // Leave space and add barcode
        pdf.addImage(barcodeImg, "PNG", 60, 36, 35, 15);
      }
    }
  
    pdf.save("labels.pdf");
  }catch(err){
    console.log("Failed to generate labels",err);
  }finally{
    setIsGenerating(false)
  }
  };
  

  return (
   <div className="container mx-auto p-6 max-w-4xl">
         <h1 className="text-2xl font-bold mb-6 flex gap-2 items-center">
           <span className="text-blue-400">
             <FaTag />
           </span>
           Label Generator 
         </h1>
   
         <div className="mb-6 p-4 bg-gray-50 rounded-lg">
           <label className="block mb-2 font-medium">
             Upload CSV File:
             <input
               type="file"
               accept=".csv"
               onChange={handleFileUpload}
               className="block w-full mt-1 p-2 border border-gray-200 cursor-pointer hover:bg-blue-50 rounded bg-white"
             />
           </label>
           
         </div>
      {products.length > 0 && (
        <button
          onClick={exportToPDF}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {isGenerating?"Generating...":"Download Lables"}
        </button>
      )}
    </div>
  );
};

export default LabelGenerator;
