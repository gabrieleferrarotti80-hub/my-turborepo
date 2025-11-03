import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';

export const FormList = ({ forms, loading, error, onSelectForm }) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-gray-500" />
                <span className="ml-4 text-gray-500">Caricamento moduli...</span>
            </div>
        );
    }

    if (error) {
        return <div className="p-6 text-center text-red-600">{error}</div>;
    }

    if (!forms || forms.length === 0) {
        return <div className="p-6 text-center text-gray-500">Nessun modulo trovato.</div>;
    }

    return (
        <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-xl">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Seleziona un Modulo</h2>
            <div className="space-y-4">
                {forms.map(form => (
                    <div 
                        key={form.id}
                        onClick={() => onSelectForm(form.id)}
                        className="flex items-center p-4 bg-gray-50 rounded-lg shadow cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                    >
                        <FontAwesomeIcon icon={faFileAlt} className="text-indigo-500 mr-4 text-xl" />
                        <span className="font-medium text-lg text-gray-700">{form.name || form.id}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};