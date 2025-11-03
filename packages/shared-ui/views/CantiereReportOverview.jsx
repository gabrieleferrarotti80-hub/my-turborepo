import React from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';

/**
 * Componente "stupido" per visualizzare la tabella riepilogativa dei report dei cantieri.
 * @param {Array} reports - L'array di report generato da useCantiereReportGenerator.
 * @param {Function} onSelectCantiere - La funzione da chiamare quando si clicca su "Vedi Dettagli".
 */
export const CantiereReportOverview = ({ reports, onSelectCantiere }) => {

    // Funzione helper per formattare le date in modo sicuro
    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (!reports || reports.length === 0) {
        return (
            <div className="text-center py-10 px-4 bg-gray-50 rounded-lg shadow-inner">
                <h3 className="text-lg font-medium text-gray-700">Nessun dato disponibile</h3>
                <p className="mt-1 text-sm text-gray-500">Non sono stati trovati dati sufficienti per generare i report dei cantieri.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md animate-fade-in">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantiere</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Inizio</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Fine</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Giorni Lavorati</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Personale Impiegato</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ispezioni</th>
                        <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Dettagli</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{report.nomeCantiere}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(report.dataInizio)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{report.dataFine ? formatDate(report.dataFine) : <span className="text-green-600 font-semibold">In corso</span>}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{report.totaleGiorniLavorati}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{report.totaleUomini}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{report.totaleIspezioni}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button
                                    onClick={() => onSelectCantiere(report)}
                                    className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                                >
                                    <EyeIcon className="h-4 w-4" />
                                    Dettagli
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};