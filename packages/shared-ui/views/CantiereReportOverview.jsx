import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/solid'; // Icona freccia per indicare navigazione

/**
 * Componente per visualizzare la tabella riepilogativa dei report dei cantieri.
 * MODIFICA: Ora l'intera riga è cliccabile per vedere i dettagli.
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
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cantiere</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data Inizio</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Data Fine</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Giorni</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Personale</th>
                        <th scope="col" className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ispezioni</th>
                        {/* Colonna vuota per la freccina */}
                        <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">Vedi</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                        <tr 
                            key={report.id} 
                            onClick={() => onSelectCantiere(report)}
                            className="group hover:bg-indigo-50 cursor-pointer transition-colors duration-200"
                        >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                {report.nomeCantiere}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(report.dataInizio)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {report.dataFine ? (
                                    formatDate(report.dataFine)
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        In corso
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center font-medium">
                                {report.totaleGiorniLavorati}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center font-medium">
                                {report.totaleUomini}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                {report.totaleIspezioni > 0 ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {report.totaleIspezioni}
                                    </span>
                                ) : (
                                    <span className="text-gray-400 text-sm">-</span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <ChevronRightIcon className="h-5 w-5 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};