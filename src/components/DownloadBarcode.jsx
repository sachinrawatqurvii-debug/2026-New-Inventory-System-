// const downloadBarcodes = (data,googleSheetColors)=>{
    
//     try {
//         // 1. Get products from localStorage
//         const products = JSON.parse(localStorage.getItem("products")) || [];
        
        
//         if (products.length === 0) {
//           alert("No products found in inventory!");
//           return;
//         }
    
//         // 2. Prepare CSV header
//         const headers =  "OrderId,Barcode,Title,Label Type,Qty\n";
        
//         // 3. Process ALL products into CSV rows
//         const csvRows = products.map(product => {
//           // const matched = data?.find((p)=>p.style_code==product.styleNumber);
//           const matched = googleSheetColors?.find((p)=>p.stylenumber==product.styleNumber);
//           console.log("barcode colors",matched)
//           // Ensure all required fields exist with fallbacks
//           return [
//             `${product.orderId}`,
//             `${product.styleNumber}-${product.size}-${product.parentStyleNumber}`,
//             // `(${matched?.rack_space==="" || matched?.rack_space.toLowerCase()==="default"  ?product?.rackSpace:matched?.rack_space}) `,
//             product?.rackSpace,
//             `${matched?.styleprimarycolor}`,
//             product?.quantity
//           ].join(',');
//         });
    
//         // 4. Combine header and all rows
//         const csvContent = headers + csvRows.join("\n");
        
//         // 5. Create download
//         const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//         const link = document.createElement("a");
//         link.href = URL.createObjectURL(blob);
//         link.download = `BulkGenerateBarcodeLabels.csv`;
//         link.click();
        
//         // 6. Clean up
//         setTimeout(() => URL.revokeObjectURL(link.href), 100);
//       } catch (error) {
//         console.error("Download failed:", error);
//         alert("Failed to generate inventory file!");
//       }
// } 
// ************************ test ******************************

let demo = "hello";
const downloadBarcodes = (data, googleSheetColors) => {
  try {
    const products = JSON.parse(localStorage.getItem("products")) || [];

    if (!products.length) {
      alert("No products found in inventory!");
      return;
    }

    const headers = "OrderId,Barcode,Title,Label Type,Qty\n";

    const rows = [];

    for (let i = 0; i < products.length; i++) {
      const current = products[i];

      // 🔹 Get color from googleSheetColors
      const matched = googleSheetColors?.find(
        (p) => p.stylenumber == current.styleNumber
      );
      const color = matched?.styleprimarycolor || "NA";

      // 🔹 Check next product for combo (consecutive same size & parentStyle)
      const next = products[i + 1];
      const isNextCombo =
        next &&
        next.parentStyleNumber === current.parentStyleNumber &&
        next.size === current.size && next.parentStyleNumber?.toString().startsWith("30");
      if (isNextCombo) {
        // ✅ Combo barcode (only if consecutive)
        rows.push([
          "-", 
          `${current.parentStyleNumber}-${current.size}`, 
          current.rackSpace,
          color,
          current.quantity,
        ]);

        // skip the next consecutive products that match
        let j = i + 1;
        while (
          j < products.length &&
          products[j].parentStyleNumber === current.parentStyleNumber &&
          products[j].size === current.size
        ) {
          j++;
        }
        i = j - 1; // move index to last combo product
      } else {
        // ✅ Single child barcode
        rows.push([
          current.orderId,
          `${current.styleNumber}-${current.size}`,
          `${current.rackSpace}*${current.parentStyleNumber}`,
          color,
          current.quantity,
        ]);
      }
    }

    // ✅ CSV generate
    const csvContent = headers + rows.map(r => r.join(",")).join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "BulkGenerateBarcodeLabels.csv";
    link.click();

    setTimeout(() => URL.revokeObjectURL(link.href), 100);
  } catch (error) {
    console.error("Download failed:", error);
    alert("Failed to generate inventory file!");
  }
};





export default downloadBarcodes;