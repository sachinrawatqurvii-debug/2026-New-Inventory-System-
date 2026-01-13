const BASE_URL = "https://return-inventory-backend.onrender.com";
import React, { useEffect, useState } from "react";
import axios from "axios";

const Session = ({ products, setProducts, setSessionStart }) => {
  const [sessionId, setSessionId] = useState(
    localStorage.getItem("sessionId") || null
  );
  const [saveProgress, setSaveProgress] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [endingSession, setEndingSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  useEffect(()=>{
    if(sessionId){
      setSessionStart(true);
    }
  },[])

  const handleStartSession = () => {
    setSessionStart(true);
    const newSessionId = `S-${Date.now()}`;
    setSessionId(newSessionId);
    localStorage.setItem("sessionId", newSessionId);
    alert("Session started.");
  };



//   const handleEndSession = async () => {
//   setSessionStart(false);
//   if (!sessionId || products.length === 0) {
//     alert("No session or products found.");
//     return;
//   }

//   setIsSaving(true);
//   setSaveProgress(0);

//   // Simulate progress while saving
//   const progressInterval = setInterval(() => {
//     setSaveProgress(prev => {
//       const next = prev + 10;
//       if (next >= 90) clearInterval(progressInterval);
//       return Math.min(next, 90);
//     });
//   }, 200);

//   try {
//     const response = await axios.post(`${BASE_URL}/api/v1/inventory-table/inventory/save`, {
//       session_id: sessionId,
//       products,
//     });

//     clearInterval(progressInterval);
//     setSaveProgress(100);

//     setTimeout(() => {
//       setIsSaving(false);
//       setSaveProgress(0);
//       alert("Session ended. Products saved.");
//     }, 300);
//   } catch (error) {
//     clearInterval(progressInterval);
//     setIsSaving(false);
//     setSaveProgress(0);
//     console.error("Failed to save products:", error);
//     alert("Error saving products.");
//   }
// };
const handleEndSession = async () => {
  setSessionStart(false);
  setEndingSession(true);
  if (!sessionId || products.length === 0) {
    alert("No session or products found.");
    return;
  }
if(!selectedLocation){
  alert("Please select Cart First.")
  return
}
  setIsSaving(true);
  setSaveProgress(0);

  const progressInterval = setInterval(() => {
    setSaveProgress((prev) => {
      const next = prev + 10;
      if (next >= 90) clearInterval(progressInterval);
      return Math.min(next, 90);
    });
  }, 200);

  try {
    await axios.post(`${BASE_URL}/api/v1/inventory-table/inventory/save`, {
      session_id: sessionId,
      location:selectedLocation,
      products,
    });
  


    clearInterval(progressInterval);
    setSaveProgress(100);

    // Save to localStorage session list
    const endedSessions = JSON.parse(localStorage.getItem("endedSessions") || "[]");
    endedSessions.push({ sessionId, productCount: products.length,createdAt: new Date().toISOString()
 });
    localStorage.setItem("endedSessions", JSON.stringify(endedSessions));

    setTimeout(() => {
      setIsSaving(false);
      setSaveProgress(0);
      alert("Session ended. Products saved.");
      setSessionId(null);
      localStorage.removeItem("sessionId"); // allow new session
      // setProducts([]); // clear UI products
      setSelectedLocation("");
      setSessionStart(false)
      setEndingSession(false);
    }, 300);
    // window.location.reload();
  } catch (error) {
    clearInterval(progressInterval);
    setIsSaving(false);
    setSaveProgress(0);
    console.error("Failed to save products:", error);
    alert("Error saving products.");
  }
};


  

  return (
    <div className="bg-blue-50 py-6 px-20 grid grid-cols-2 gap-4 mb-2 rounded shadow">
      
      <button
        onClick={handleStartSession}
        className="bg-blue-500 py-4 px-4 rounded shadow cursor-pointer font-medium text-white hover:bg-blue-600 duration-75 ease-in"
        disabled={!!sessionId}
      >
        Start Session test
      </button>
      <button
        onClick={handleEndSession}
        className="bg-red-500 py-4 px-4 rounded shadow cursor-pointer font-medium text-white hover:bg-red-600 duration-75 ease-in"
        disabled={!sessionId}
      >
        End Session
      </button>
         <div className={`${endingSession?"block":"hidden"} col-span-3 text-sm text-blue-700 font-semibold text-center mt-2`}>
          <select 
          onChange={(e)=>setSelectedLocation(e.target.value)}
          className="border border-blue-300 py-2 px-4 w-full rounded outline-blue-500"
          >
            <option value="">Select Cart</option>
            <option value="Big Cart">Big Cart</option>
            <option value="Small Cart">Small Cart</option>
            <option value="Tag Generation">Tag Generation</option>
          </select>
        </div>
      {sessionId && (
        <div className="col-span-3 text-sm text-blue-700 font-semibold text-center mt-2">
          Active Session ID: <span className="font-mono">{sessionId}</span>
        </div>
      )}
      {isSaving && (
  <div className="col-span-3 mt-2">
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
      <div
        className="bg-blue-600 h-full text-xs text-white text-center transition-all duration-200 ease-out"
        style={{ width: `${saveProgress}%` }}
      >
        {saveProgress}%
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default Session;
