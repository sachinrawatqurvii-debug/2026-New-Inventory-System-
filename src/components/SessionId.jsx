import React, { useEffect, useState } from "react";
import axios from "axios";

const SessionId = () => {
  const [sessions, setSessions] = useState([]);
  const BASE_URL = "https://return-inventory-backend.onrender.com";

  

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("endedSessions") || "[]");
    setSessions(stored);
  }, []);

  const handleDone = async (sessionIdToDelete) => {
    const confiremed = window.confirm(
      "Are you sure want to delete this session"
    );
    if (!confiremed) {
      return;
    }
    try {
      await axios.post(`${BASE_URL}/api/v1/inventory-table/inventory/delete`, {
        session_id: sessionIdToDelete,
      });

      // Remove from localStorage
      const updated = sessions.filter((s) => s.sessionId !== sessionIdToDelete);
      setSessions(updated);
      localStorage.setItem("endedSessions", JSON.stringify(updated));
      alert(`Deleted products for session: ${sessionIdToDelete}`);
    } catch (err) {
      console.error(err);
      alert("Failed to delete products.");
    }
  };

  if (sessions.length === 0)
    return <p className="ml-4 mt-4 font-medium">No Pending Session.</p>;

  return (
    <div className="bg-yellow-50 w-3xl rounded p-4 shadow mx-auto mt-4">
      <h2 className="text-lg font-semibold mb-2 text-yellow-800">
        Pending Sessions
      </h2>
      <ul className="space-y-3">
        {sessions.map((s) => (
          <li
            key={s.sessionId}
            className="flex justify-between items-center bg-white p-3 rounded shadow"
          >
            <div>
              <p className="font-mono text-blue-700">{s.sessionId}</p>
              <p className="text-sm text-gray-600">
                Products: {s.productCount}
              </p>
              <p className="text-sm text-gray-600">
                Created At :
                {new Date(s.createdAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <button
              onClick={() => handleDone(s.sessionId)}
              className="bg-green-500 hover:bg-green-600 cursor-pointer text-white px-4 py-2 rounded"
            >
              Done
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SessionId;
