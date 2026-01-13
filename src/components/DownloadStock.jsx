const downloadStock = (data,googleSheetColors) => {
    
    try {
      // 1. Get products from localStorage
      const products = JSON.parse(localStorage.getItem("products")) || [];
      
      
      if (products.length === 0) {
        alert("No products found in inventory!");
        return;
      }
  
      // 2. Prepare CSV header
      const headers = "DropshipWarehouseId,Item SkuCode,InventoryAction,QtyIncludesBlocked,Qty,RackSpace,Last Purchase Price,Notes\n";
      
      // 3. Process ALL products into CSV rows
      const csvRows = products.map(product => {
        // const matched = data?.find((p)=>p.style_code==product.styleNumber);
        const matched = googleSheetColors?.find((p)=>p.stylenumber==product.styleNumber);
        // Ensure all required fields exist with fallbacks
        return [
          '22784', // DropshipWarehouseId
          `${product.styleNumber}-${matched?.styleprimarycolor || ""}-${product.size}` || 'MISSING_SKU', // Item SkuCode
          'ADD', // InventoryAction
          '', // QtyIncludesBlocked (empty)
          product.quantity || 0, // Qty
          product?.rackSpace, // RackSpace (quoted)
          '', // Last Purchase Price (empty)
          '' // Notes (empty)
        ].join(',');
      });
  
      // 4. Combine header and all rows
      const csvContent = headers + csvRows.join("\n");
      
      // 5. Create download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `UpdateInStockQtyAnd_orLastPurchasePrice.csv`;
      link.click();
      
      // 6. Clean up
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to generate inventory file!");
    }
  };
  
  export default downloadStock;