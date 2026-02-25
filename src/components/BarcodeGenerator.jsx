import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import { FaBarcode } from 'react-icons/fa';
import axios from 'axios';
const BarcodeGenerator = () => {
  const [products, setProducts] = useState([]);
  const [orderIds, setOrderIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [generationStage, setGenerationStage] = useState('');
  const previewRef = useRef(null);
  const abortControllerRef = useRef(null);
  const MAPPING_BASE_URL = 'https://raw-material-backend.onrender.com/api/v1/order-id-mapping';

  // Progress bar component
  const ProgressBar = () => (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between mb-2">
        <span className="font-medium">{generationStage}</span>
        <span className="font-medium">{progress.percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-green-600 h-4 rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        ></div>
      </div>
      <div className="text-sm text-gray-500 mt-2 text-center">
        {progress.current} of {progress.total} barcodes generated
      </div>
    </div>
  );

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => parseCSV(event.target.result);
    reader.readAsText(file);
  };

  const parseCSV = (csv) => {
    const lines = csv.split('\n');
    const parsed = lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const cols = line.split(',');
        if (cols.length < 4) return null;
        return {
          sku: cols[1]?.trim(),
          color: cols[3]?.trim(),
          rackSpace: cols[2]?.trim(),
          quantity: parseInt(cols[4]) || 1,
          orderId: cols[0]?.trim() || '',
        };
      })
      .filter((p) => p && p.sku);
    let orderIdsList = parsed.filter((item) => item.orderId !== '-');
    setOrderIds(orderIdsList);

    setProducts(parsed);
    setPreviewUrl('');
    setProgress({ current: 0, total: 0, percentage: 0 });
  };

  // Optimized barcode creation with caching
  const createBarcodeImage = async (product) => {
    // Use a simple canvas element instead of creating new one each time
    const canvas = document.createElement('canvas');
    const widthPx = 1181;
    const heightPx = 591;

    canvas.width = widthPx;
    canvas.height = heightPx;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, widthPx, heightPx);

    // Create barcode
    const barcodeCanvas = document.createElement('canvas');
    JsBarcode(barcodeCanvas, product.sku, {
      format: 'CODE128',
      width: 6,
      height: 200,
      displayValue: false,
      margin: 0,
    });

    // Draw barcode
    const barcodeX = (widthPx - barcodeCanvas.width) / 2;
    const barcodeY = 150;
    ctx.drawImage(barcodeCanvas, barcodeX, barcodeY);

    // Add text label
    ctx.fillStyle = 'black';
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';

    const [rackMain, rackExtraRaw] = product.rackSpace.split('*');
    const rackExtra =
      rackExtraRaw && rackExtraRaw !== 'null' && rackExtraRaw !== 'undefined' ? rackExtraRaw : null;

    const styleNo = product.sku.split('-')[0];
    const size = product.sku.split('-')[1];

    const label = `${
      styleNo.startsWith('30')
        ? `(${rackMain})`
        : rackExtra
          ? `(${rackMain})(${rackExtra})`
          : `(${rackMain})`
    } ${styleNo}-${product.color}-${size}`;

    ctx.fillText(label, widthPx / 2, heightPx - 150);

    // Clean up
    barcodeCanvas.remove();

    return canvas.toDataURL('image/png');
  };

  // Batch processing for better performance
  const processInBatches = async (items, batchSize, processFn) => {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    const results = [];
    for (let i = 0; i < batches.length; i++) {
      // Check if operation was cancelled
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Operation cancelled');
      }

      const batch = batches[i];
      const batchPromises = batch.map((item) => processFn(item));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Update progress
      const current = Math.min((i + 1) * batchSize, items.length);
      const percentage = Math.round((current / items.length) * 100);
      setProgress({
        current,
        total: items.length,
        percentage,
      });

      // Small delay to prevent blocking
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return results;
  };

  const exportToPDF = async () => {
    if (products.length === 0) return;

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      setIsGenerating(true);
      setGenerationStage('Preparing barcodes...');

      // Calculate total barcodes needed
      const totalBarcodes = products.reduce((sum, product) => {
        const isComboStyle = product.sku?.split('-')[0]?.startsWith('30');
        return sum + (isComboStyle ? 1 : product.quantity);
      }, 0);

      setProgress({
        current: 0,
        total: totalBarcodes,
        percentage: 0,
      });

      // Step 1: Generate unique barcode images (batch processing)
      setGenerationStage('Generating barcode images...');
      const uniqueProducts = [];
      const seen = new Set();

      products.forEach((product) => {
        const key = `${product.sku}_${product.color}_${product.rackSpace}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueProducts.push(product);
        }
      });

      const imageCache = {};
      await processInBatches(uniqueProducts, 5, async (product) => {
        const key = `${product.sku}_${product.color}_${product.rackSpace}`;
        if (!imageCache[key]) {
          imageCache[key] = await createBarcodeImage(product);
        }
        return key;
      });

      // Step 2: Create PDF with all barcodes
      setGenerationStage('Creating PDF document...');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [100, 50],
      });

      let pageCount = 0;
      const totalPages = totalBarcodes;

      for (const product of products) {
        const key = `${product.sku}_${product.color}_${product.rackSpace}`;
        const isComboStyle = product.sku?.split('-')[0]?.startsWith('30');
        const pagesToPrint = isComboStyle ? 1 : product.quantity;

        for (let i = 0; i < pagesToPrint; i++) {
          if (pageCount > 0) {
            pdf.addPage([100, 50], 'landscape');
          }

          pdf.addImage(imageCache[key], 'PNG', 0, 0, 100, 50);
          pageCount++;

          // Update progress
          const percentage = Math.round((pageCount / totalPages) * 100);
          setProgress({
            current: pageCount,
            total: totalPages,
            percentage,
          });

          // Small delay to prevent UI blocking
          if (pageCount % 10 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          // Check cancellation
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Operation cancelled');
          }
        }
      }

      setGenerationStage('Finalizing PDF...');
      await new Promise((resolve) => setTimeout(resolve, 500));

      pdf.save(`barcodes_${new Date().toISOString().slice(0, 10)}.pdf`);

      // Reset progress
      setProgress({ current: 0, total: 0, percentage: 0 });
      setGenerationStage('');
    } catch (err) {
      if (err.message !== 'Operation cancelled') {
        console.error('Export error:', err);
        alert('PDF export failed: ' + err.message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePreview = async () => {
    if (products.length === 0) return alert('No products to preview!');

    try {
      setIsGenerating(true);
      setGenerationStage('Generating preview...');
      setProgress({ current: 1, total: 1, percentage: 0 });

      const img = await createBarcodeImage(products[0]);
      setPreviewUrl(img);

      setProgress({ current: 1, total: 1, percentage: 100 });
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error('Preview error:', err);
      alert('Preview failed.');
    } finally {
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, percentage: 0 });
      setGenerationStage('');
    }
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setProgress({ current: 0, total: 0, percentage: 0 });
      setGenerationStage('');
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (previewRef.current) {
        document.body.removeChild(previewRef.current);
      }
    };
  }, []);

  const upsertRackSpaceMapping = async () => {
    try {
      const payload = orderIds.map((item) => ({
        order_id: item.orderId,
        style_number: item.sku.split,
        size: item.sku.split('-')[1],
        rack_space: item.rackSpace?.split('*')[0] || '',
        color: item.color || '',
      }));
      console.log('payload', payload);
      const response = await axios.post(`${MAPPING_BASE_URL}/upsertRackSpace`, payload);
      console.log('Upsert rack space response', response.data);
    } catch (error) {
      console.log('Failed to upsert rack details', error);
    }
  };
  if (isGenerating) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 flex gap-2 items-center">
          <span className="text-blue-400">
            <FaBarcode />
          </span>
          Barcode Generator
        </h1>

        <div className="text-center">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">{generationStage}</h2>
            <ProgressBar />
          </div>

          <button
            onClick={cancelGeneration}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Cancel Generation
          </button>

          <p className="text-gray-500 mt-4">Please wait while barcodes are being generated...</p>
        </div>
      </div>
    );
  }

  console.log('uploaded barcode data', products);
  console.log('order ids', orderIds);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 flex gap-2 items-center">
        <span className="text-blue-400">
          <FaBarcode />
        </span>
        Barcode Generator
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
        <p className="text-sm text-gray-500 mt-1">
          Format: SKU, Product Name, Label Type, Quantity
        </p>
      </div>

      {products.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between mb-3 items-center">
            <h2 className="text-xl font-semibold">
              Loaded Products ({products.reduce((sum, p) => sum + p.quantity, 0)} labels)
            </h2>
            <div className="flex gap-2">
              <button
                onClick={generatePreview}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Preview Sample
              </button>
              <button
                onClick={() => {
                  exportToPDF();
                  upsertRackSpaceMapping();
                }}
                disabled={isGenerating}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                Download Barcodes
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">SKU</th>
                  <th className="p-3 text-left">Color</th>
                  <th className="p-3 text-left">Rack Space</th>
                  <th className="p-3 text-left">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3">{product.sku}</td>
                    <td className="p-3">{product.color}</td>
                    <td className="p-3">{product.rackSpace}</td>
                    <td className="p-3">{product.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previewUrl && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Barcode Preview (100mm × 50mm)</h2>
          <div className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="Preview"
                className="border border-gray-200"
                style={{ width: '100mm', height: '50mm' }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              All barcodes will be in a single PDF, one per 100×50mm page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeGenerator;
