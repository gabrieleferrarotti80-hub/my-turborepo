import React from 'react';
import { ArrowLeftIcon, CalendarDaysIcon, UsersIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

/**
 * Componente "stupido" per visualizzare i dettagli completi del report di un singolo cantiere.
 * @param {Object} report - L'oggetto del report completo per un cantiere.
 * @param {Function} onBack - La funzione da chiamare per tornare alla vista d'insieme.
 */
export const CantiereReportDetailView = ({ report, onBack }) => {

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('it-IT', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header con titolo e pulsante "Indietro" */}
            <div>
                <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Torna alla Panoramica
                </button>
                <h2 className="text-3xl font-bold text-gray-900">{report.nomeCantiere}</h2>
            </div>

            {/* Sezione di Riepilogo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-green-50 p-4 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-green-800">Data Inizio</p>
                    <p className="text-lg font-bold text-green-900">{formatDate(report.dataInizio)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-red-800">Data Fine</p>
                    <p className="text-lg font-bold text-red-900">{report.dataFine ? formatDate(report.dataFine) : 'In corso'}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-blue-800">Totale Giorni Lavorati</p>
                    <p className="text-lg font-bold text-blue-900">{report.totaleGiorniLavorati}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-yellow-800">Personale Unico</p>
                    <p className="text-lg font-bold text-yellow-900">{report.totaleUomini}</p>
                </div>
            </div>

            {/* Dettagli in Colonne */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Colonna Sinistra: Giornate e Personale */}
                <div className="space-y-8">
                    {/* Dettaglio Giornate Lavorate */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
                            <CalendarDaysIcon className="h-6 w-6 text-gray-500" />
                            Dettaglio Giornate
                        </h3>
                        {report.dettaglioGiornate && report.dettaglioGiornate.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                                {report.dettaglioGiornate.map(({ giorno, personale }) => (
                                    <li key={giorno} className="py-3">
                                        <p className="font-semibold">{formatDate(giorno)}</p>
                                        <p className="text-sm text-gray-600">Personale: {personale.join(', ') || 'N/D'}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500">Nessun dettaglio sulle giornate lavorate.</p>}
                    </div>

                    {/* Dettaglio Personale Impiegato */}
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
                            <UsersIcon className="h-6 w-6 text-gray-500" />
                            Personale Coinvolto
                        </h3>
                        {report.dettaglioPersonale && report.dettaglioPersonale.length > 0 ? (
                            <ul className="list-disc list-inside text-sm text-gray-700">
                                {report.dettaglioPersonale.map(user => user && <li key={user.id}>{user.nome} {user.cognome} ({user.ruolo})</li>)}
                            </ul>
                        ) : <p className="text-sm text-gray-500">Nessun dettaglio sul personale.</p>}
                    </div>
                </div>

                {/* Colonna Destra: Ispezioni */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800 mb-4">
                        <ClipboardDocumentCheckIcon className="h-6 w-6 text-gray-500" />
                        Ispezioni dei Tecnici ({report.totaleIspezioni})
                    </h3>
                    {report.dettaglioIspezioni && report.dettaglioIspezioni.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {report.dettaglioIspezioni.map(ispezione => (
                                <li key={ispezione.id} className="py-3">
                                    <p className="font-semibold">{formatDate(ispezione.createdAt)} - {ispezione.tipologia}</p>
                                    <p className="text-sm text-gray-600 mt-1 italic">"{ispezione.note || 'Nessuna nota.'}"</p>
                                    {ispezione.fileUrl && <a href={ispezione.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline">Vedi allegato</a>}
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-gray-500">Nessuna ispezione registrata per questo cantiere.</p>}
                </div>
            </div>
        </div>
    );
};