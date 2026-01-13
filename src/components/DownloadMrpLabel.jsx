const downloadMrpLable = (data, googleSheetColors)=>{
    try {
        // 1. Get products from localStorage
        const products = JSON.parse(localStorage.getItem("products")) || [];
        if (products.length === 0) {
          alert("No products found in inventory!");
          return;
        }
    
        // 2. Prepare CSV header
        const headers =  "Label Type,Sku Code,Sku Name,Brand,Color,Size,Unit,MRP,Qty,Custom Text\n";
        
        // 3. Process ALL products into CSV rows
        const csvRows = products.map(product => {
          // const matched = data?.find((p)=>p.style_code==product.styleNumber);
          const matched = googleSheetColors?.find((p)=>p.stylenumber==product.styleNumber);
          const custome_Text =`MFG & MKT BY: Qurvii. 2nd Floor. B149. Sector 6. Noida. UP. 201301`;
          // Ensure all required fields exist with fallbacks
          return [
            '50 mm x 25 mm on Roll - PDF', // DropshipWarehouseId
            `${product.styleNumber}-${product.size}` , // Item SkuCode
            matched?.stylename?.trim() || "Qurvii Product",
            'Qurvii',
            matched?.styleprimarycolor?.trim() || "Other",
            product?.size,
            '1 Pcs',
            matched?.mrp || 4360,
            product?.quantity || 0, // Qty
            custome_Text
          ].join(',');
        });
    
        // 4. Combine header and all rows
        const csvContent = headers + csvRows.join("\n");
        
        // 5. Create download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `BulkGenerateProductRetailLabels.csv`;
        link.click();
        
        // 6. Clean up
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
      } catch (error) {
        console.error("Download failed:", error);
        alert("Failed to generate inventory file!");
      }
}

export default downloadMrpLable;