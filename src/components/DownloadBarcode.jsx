const downloadBarcodes = (data, googleSheetColors) => {
  try {
    const products = JSON.parse(localStorage.getItem('products')) || [];

    if (!products.length) {
      alert('No products found in inventory!');
      return;
    }

    const headers = 'OrderId,Barcode,Title,Label Type,Qty\n';

    const rows = [];

    for (let i = 0; i < products.length; i++) {
      const current = products[i];

      // 🔹 Get color from googleSheetColors
      const matched = googleSheetColors?.find((p) => p.stylenumber == current.styleNumber);
      const color = matched?.styleprimarycolor || 'NA';

      // 🔹 Check next product for combo (consecutive same size & parentStyle)
      const next = products[i + 1];
      const isNextCombo =
        next &&
        next.parentStyleNumber === current.parentStyleNumber &&
        next.size === current.size &&
        next.parentStyleNumber?.toString().startsWith('30');
      if (isNextCombo) {
        // ✅ Combo barcode (only if consecutive)
        rows.push([
          '-',
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
    const csvContent = headers + rows.map((r) => r.join(',')).join('\n');

    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'BulkGenerateBarcodeLabels.csv';
    link.click();

    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    setTimeout(() => {
      localStorage.removeItem('racks');
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to generate inventory file!');
  }
};

export default downloadBarcodes;
