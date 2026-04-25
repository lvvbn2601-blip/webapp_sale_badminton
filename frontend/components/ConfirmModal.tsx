import React, { useEffect, useState } from "react";
// @ts-ignore
import { createRoot } from "react-dom/client";
import { AlertCircle } from "lucide-react";

interface ConfirmModalUIProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModalUI: React.FC<ConfirmModalUIProps> = ({ message, onConfirm, onCancel }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancel]);

  const handleClose = (action: () => void) => {
    setIsVisible(false);
    setTimeout(action, 300); // Wait for transition
  };

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => handleClose(onCancel)}
      />
      
      {/* Modal Dialog */}
      <div className={`relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl transition-all duration-300 transform scale-95 dark:bg-gray-800 ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}>
        <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="mb-2 font-heading text-xl font-bold text-secondary dark:text-white">
                Confirm Action
            </h3>
            <p className="mb-6 text-sm text-secondary/60 dark:text-gray-400">
                {message || "Are you sure you want to perform this action? This cannot be undone."}
            </p>
        </div>

        <div className="flex items-center gap-3 w-full">
            <button 
                onClick={() => handleClose(onCancel)}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-3.5 text-sm font-bold text-secondary transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 focus:outline-none"
            >
                Cancel
            </button>
            <button 
                onClick={() => handleClose(onConfirm)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-700 focus:outline-none"
            >
                Delete
            </button>
        </div>
      </div>
    </div>
  );
};

export const confirmAction = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Only run in browser
    if (typeof window === "undefined" || typeof document === "undefined") {
      resolve(true);
      return;
    }

    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);

    const cleanup = () => {
      setTimeout(() => {
        root.unmount();
        div.remove();
      }, 300); // allow unmount transition to finish
    };

    const handleConfirm = () => {
      resolve(true);
      cleanup();
    };

    const handleCancel = () => {
      resolve(false);
      cleanup();
    };

    root.render(
      <ConfirmModalUI 
        message={message} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel} 
      />
    );
  });
};
