import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import {
  FaUpload,
  FaCheckCircle,
  FaSpinner,
  FaFileCsv,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { MdCloudUpload, MdDelete } from 'react-icons/md';

const UploadRackSpace = () => {
  const [loading, setLoading] = useState(false);
  const [syncCompleted, setSyncCompleted] = useState(false);
  const [globalRackSpace, setGlobalRackSpace] = useState([]);
  const [uploadStats, setUploadStats] = useState({ total: 0, processed: 0 });
  const [localStorageData, setLocalStorageData] = useState({});
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  // ********************* load localstorage data **********************
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('racks')) || {};
    setLocalStorageData(data);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset states
    setFileName(file.name);
    setLoading(true);
    setSyncCompleted(false);
    setError('');
    setGlobalRackSpace([]);
    setUploadStats({ total: 0, processed: 0 });

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file only.');
      setLoading(false);
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const processedData = results.data
          .map((row) => {
            const skuCode = row['Item SkuCode'] || '';
            const skuParts = skuCode.split('-') || [];
            return {
              styleNumber: parseInt(skuParts[0]) || 0,
              size: skuParts[2] || '',
              rackSpace: row['Rack Space'] || 'N/A',
              inStock: parseInt(row['InStock']) || 0,
            };
          })
          .filter((item) => item.styleNumber && item.size);

        setGlobalRackSpace(processedData);
        setLoading(false);
        setSyncCompleted(true);
        setUploadStats({
          total: results.data.length,
          processed: processedData.length,
        });

        console.log('Global RackSpace data processed:', processedData);
      },
      error: (error) => {
        setLoading(false);
        setError('Error parsing CSV file. Please check the file format.');
        console.error('CSV Parsing Error:', error);
      },
    });
  };

  const multipleRack = () => {
    let rackMap = {};

    for (let rack of globalRackSpace) {
      const styleNumber = rack.styleNumber;
      const rackSpace = rack.rackSpace;
      const inStock = rack.inStock || 0;

      if (!rackMap[styleNumber]) {
        rackMap[styleNumber] = {};
      }

      if (rackSpace && rackSpace !== 'N/A') {
        if (!rackMap[styleNumber][rackSpace]) {
          rackMap[styleNumber][rackSpace] = 0;
        }
        rackMap[styleNumber][rackSpace] += inStock;
      }
    }

    localStorage.setItem('racks', JSON.stringify(rackMap));
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    return rackMap;
  };

  const handleReset = () => {
    setFileName('');
    setGlobalRackSpace([]);
    setSyncCompleted(false);
    setError('');
    setUploadStats({ total: 0, processed: 0 });
    // Reset file input
    const fileInput = document.getElementById('rackSpaceFile');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 flex items-center gap-3">
            <FaUpload className="text-blue-600" />
            Rack Space Upload
          </h1>
          <p className="text-gray-600 mt-2">
            Upload your Global Rack Space CSV file to process inventory data
          </p>
        </div>
        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          {/* File Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Upload CSV File</label>
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 
              ${fileName ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}
              ${error ? 'border-red-500 bg-red-50' : ''}`}
            >
              {!fileName ? (
                <>
                  <MdCloudUpload className="text-5xl text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Drag & drop your CSV file here or</p>
                  <label htmlFor="rackSpaceFile" className="cursor-pointer">
                    <span className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-300">
                      <FaUpload className="mr-2" />
                      Browse Files
                    </span>
                    <input
                      id="rackSpaceFile"
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-4">Supports .csv files only</p>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <FaFileCsv className="text-4xl text-blue-600 mb-3" />
                  <p className="text-lg font-medium text-gray-800">{fileName}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    {loading ? 'Processing...' : 'Ready to sync'}
                  </p>

                  <div className="flex gap-3 mt-4">
                    <label htmlFor="rackSpaceFile" className="cursor-pointer">
                      <span className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg hover:bg-blue-200 transition-colors">
                        Change File
                      </span>
                      <input
                        id="rackSpaceFile"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={handleReset}
                      className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <MdDelete className="mr-2" />
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Processing...</span>
                <span className="text-sm text-gray-500">
                  {uploadStats.processed}/{uploadStats.total} items
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${uploadStats.total ? (uploadStats.processed / uploadStats.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-center mt-4 text-blue-600">
                <FaSpinner className="animate-spin mr-2" />
                <span>Parsing CSV data...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6">
              <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-xl">
                <FaExclamationTriangle className="text-red-500 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Upload Error</p>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {syncCompleted && !loading && (
            <div className="mb-6">
              <div className="flex items-start p-4 bg-green-50 border border-green-200 rounded-xl">
                <FaCheckCircle className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Upload Successful!</p>
                  <p className="text-green-600">
                    Processed {uploadStats.processed} items from your CSV file.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end">
            <button
              onClick={() => multipleRack()}
              className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-300
                ${
                  globalRackSpace.length > 0 && !loading
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <FaCheckCircle className="mr-2" />
                  Sync to Database
                </>
              )}
            </button>
          </div>
        </div>

        {/* Data Preview */}
        {globalRackSpace.length > 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Data Preview</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                {globalRackSpace.length} items
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Style Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rack Space
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      In Stock
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {globalRackSpace.slice(0, 5).map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.styleNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.size}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.rackSpace === 'N/A'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {item.rackSpace}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.inStock > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.inStock}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {globalRackSpace.length > 5 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing first 5 of {globalRackSpace.length} items
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center">
            <FaExclamationTriangle className="mr-2 text-blue-600" />
            File Requirements
          </h3>
          <ul className="text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
              CSV file must contain columns: "Item SkuCode", "Rack Space", and "InStock"
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
              "Item SkuCode" should be in format: "12345-COLOR-SIZE"
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></span>
              Maximum file size: 50MB
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UploadRackSpace;
