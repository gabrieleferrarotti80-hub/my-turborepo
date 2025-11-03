// src/components/Modal.jsx

import React from 'react';

const Modal = ({ isOpen, onClose, title, message, onConfirm, actionText, isDanger }) => {
    if (!isOpen) return null;

    const actionButtonClass = isDanger 
        ? "bg-red-500 hover:bg-red-600 focus:ring-red-500"
        : "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500";

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center" onClick={onClose}>
            <div className="relative p-8 bg-white w-96 max-w-lg mx-auto rounded-xl shadow-lg animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end space-x-4">
                    <button
                        onClick={onClose}
                        className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Annulla
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${actionButtonClass}`}
                    >
                        {actionText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;