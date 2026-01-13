import React from 'react';
import { FaDownload, FaTrash, FaBoxes, FaTags, FaBarcode, FaPlus } from 'react-icons/fa';
import downloadStock from './DownloadStock';
import { useGlobalContext } from './context/ProductContext';
import downloadMrpLable from './DownloadMrpLabel';
import downloadBarcodes from './DownloadBarcode';
import { Link } from 'react-router-dom';
import { PiEngine } from 'react-icons/pi';
const Navbar = () => {

  const {productsData, colors, googleSheetColors} = useGlobalContext();

  const deleteAll= ()=>{
    if (window.confirm('Are you sure you want to delete this product?')){
      localStorage.removeItem('products');
      window.location.reload();
    }
  }
  return (
    <div className="w-64 h-screen bg-gradient-to-b from-gray-800 to-gray-900 p-6 flex flex-col border-r border-gray-700">
      {/* Brand Logo */}
      <div className="mb-8">
        <h4 className="text-2xl font-bold text-white">
          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Qurvii
          </span>
        </h4>
        <p className="text-xs text-gray-400 mt-1">Inventory Management</p>
      </div>

      {/* Navigation Buttons */}
      <div className="space-y-2 flex-1">


      <div>
        <h2 className='text-white text-xl'>Inventory Menu</h2>
        <hr className='text-slate-700 mt-2' />
       <Link
        to="/"
        className="w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 text-gray-300 hover:text-white group">
          <FaPlus className="text-green-400 group-blue:text-green-300" />
          <span>Add New </span>
          
        </Link>
        <Link
        to="/barcode-generation"
        className="w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 text-gray-300 hover:text-white group">
          <FaBarcode className="text-blue-400 group-blue:text-purple-300" />
          <span>Generate Barcodes</span>
          
        </Link>
     
          <Link
        to="https://orderid.netlify.app/" target='_blank'
        className="w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 text-gray-300 hover:text-white group">
          <FaTags className="text-pink-400 group-hover:text-pink-300" />
          <span>Generate Labels</span>
          
        </Link>
           <Link
        to="/sessions"
        className="w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 text-gray-300 hover:text-white group">
          <PiEngine className="text-red-400 group-hover:text-red-300" />
          
          <span>Session</span>
          
        </Link>
       </div>




        <div className='my-5'>
        <h2 className='text-white text-xl'>Download Buttons</h2>
        <hr className='text-slate-700 my-2' />
        <button 
          onClick={()=>downloadStock(colors,googleSheetColors)}
        className="w-full cursor-pointer flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-all duration-200 text-white group">
          <FaBoxes className="text-blue-400 group-hover:text-blue-300" />
          <span>Inventory</span>
          <FaDownload className="ml-auto text-gray-400 text-sm" />
        </button>

        <button
        onClick={()=>downloadMrpLable(productsData, googleSheetColors)}
        className="w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 text-gray-300 hover:text-white group">
          <FaTags className="text-yellow-400 group-hover:text-yellow-300" />
          <span>Labels</span>
          <FaDownload className="ml-auto text-gray-400 text-sm" />
        </button>

        <button
        onClick={()=>downloadBarcodes(productsData,googleSheetColors)}
        className="w-full flex cursor-pointer items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700 transition-all duration-200 text-gray-300 hover:text-white group">
          <FaBarcode className="text-purple-400 group-hover:text-purple-300" />
          <span>Barcodes</span>
          <FaDownload className="ml-auto text-gray-400 text-sm" />
        </button>

        </div>
      </div>

      {/* Bottom Action Button */}
      <div className="mt-auto pt-4">
        <button onClick={()=>deleteAll()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-all duration-200 text-red-400 hover:text-red-300 border border-red-500/30">
          <FaTrash />
          <span>Delete All</span>
        </button>
      </div>
    </div>
  );
};

export default Navbar;