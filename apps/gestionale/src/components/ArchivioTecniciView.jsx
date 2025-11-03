// src/components/ArchivioTecniciView.jsx

import React from 'react';
// highlight-start
import { useFirebaseData } from 'shared-core';; // Percorso relativo aggiornato
// highlight-end
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

// <-- 1. Aggiunta la prop onEdit
const ArchivioTecniciView = ({ onBack, onEdit }) => {
    const { reportTecnico, loadingData } = useFirebaseData();

    if (loadingData) {
        return <div className="text-center p-8">Caricamento...</div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:underline">
                <ArrowLeftIcon className="h-4 w-4" />
                Torna al menu
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Archivio Report Tecnici</h1>

            {reportTecnico.length === 0 ? (
                <p className="text-gray-500">Nessun report tecnico trovato.</p>
            ) : (
                <div className="bg-white rounded-2xl shadow-xl overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tecnico</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantiere</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                                {/* <-- 2. Nuova colonna Azioni */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportTecnico.map(report => (
                                <tr key={report.id}>
                                    {/* <-- 4. Aggiunto '?' per sicurezza */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{report.data?.toLocaleDateString('it-IT')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{report.tecnicoName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{report.cantiereName}</td>
                                    <td className="px-6 py-4 text-sm">{report.note}</td>
                                    {/* <-- 3. Aggiunto pulsante Modifica */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button 
                                            onClick={() => onEdit(report)}
                                            className="text-indigo-600 hover:text-indigo-900"
                                        >
                                            Modifica
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ArchivioTecniciView;