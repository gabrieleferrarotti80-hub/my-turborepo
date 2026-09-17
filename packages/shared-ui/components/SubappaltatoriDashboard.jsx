import React, { useState } from 'react';
import { 
    PlusIcon, PencilIcon, TrashIcon, 
    ShieldCheckIcon, ExclamationTriangleIcon, XCircleIcon, 
    BuildingOfficeIcon, PhoneIcon, EnvelopeIcon
} from '@heroicons/react/24/solid';

// Funzione intelligente per calcolare lo stato dei documenti
const getStatoDocumento = (dataScadenza) => {
    if (!dataScadenza) return { color: 'bg-red-50 text-red-700 border-red-200', icon: <XCircleIcon className="h-4 w-4"/>, text: 'Mancante' };
    
    const oggi = new Date();
    oggi.setHours(0,0,0,0);
    const scadenza = new Date(dataScadenza);
    const diffGiorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));

    if (diffGiorni < 0) return { color: 'bg-red-100 text-red-800 border-red-300 font-bold', icon: <XCircleIcon className="h-4 w-4"/>, text: 'Scaduto' };
    if (diffGiorni <= 15) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-bold', icon: <ExclamationTriangleIcon className="h-4 w-4"/>, text: `Scade tra ${diffGiorni} gg` };
    return { color: 'bg-green-50 text-green-700 border-green-200', icon: <ShieldCheckIcon className="h-4 w-4"/>, text: 'Valido' };
};

const DocumentBadge = ({ label, dataScadenza }) => {
    const stato = getStatoDocumento(dataScadenza);
    return (
        <div className={`flex flex-col items-center justify-center p-2 rounded-lg border ${stato.color} min-w-[90px]`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 mb-1">{label}</span>
            <div className="flex items-center gap-1 text-xs">
                {stato.icon} <span>{stato.text}</span>
            </div>
            {dataScadenza && <span className="text-[10px] mt-1 opacity-80">{new Date(dataScadenza).toLocaleDateString()}</span>}
        </div>
    );
};

export const SubappaltatoriDashboard = ({ subappaltatori = [], onAdd, onEdit, onDelete }) => {
    const [ricerca, setRicerca] = useState("");

    const filtrati = subappaltatori.filter(s => 
        s.ragioneSociale?.toLowerCase().includes(ricerca.toLowerCase()) || 
        s.categoria?.toLowerCase().includes(ricerca.toLowerCase()) ||
        s.partitaIva?.includes(ricerca)
    );

    return (
        <div className="space-y-6">
            {/* Header Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-1/2">
                    <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                    <input 
                        type="text" 
                        placeholder="Cerca per nome, P.IVA o categoria..." 
                        value={ricerca}
                        onChange={(e) => setRicerca(e.target.value)}
                        className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                </div>
                <button onClick={onAdd} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm font-medium transition-colors">
                    <PlusIcon className="h-5 w-5" /> Nuovo Subappaltatore
                </button>
            </div>

            {/* Griglia Card Subappaltatori */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtrati.map(sub => (
                    <div key={sub.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase tracking-wider mb-2">{sub.categoria || 'Generico'}</span>
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{sub.ragioneSociale}</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onEdit(sub)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => onDelete(sub.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <div className="text-sm text-gray-500 space-y-1 mt-3">
                                <p><strong>P.IVA:</strong> {sub.partitaIva || 'N/D'}</p>
                                {(sub.telefono || sub.email) && (
                                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-gray-50">
                                        {sub.telefono && <span className="flex items-center gap-1"><PhoneIcon className="h-4 w-4 text-gray-400"/> {sub.telefono}</span>}
                                        {sub.email && <span className="flex items-center gap-1"><EnvelopeIcon className="h-4 w-4 text-gray-400"/> {sub.email}</span>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Area Semafori Documenti */}
                        <div className="p-4 bg-gray-50 flex-1 flex flex-col justify-end">
                            <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Stato Documentale (D.Lgs. 81/08)</p>
                            <div className="grid grid-cols-3 gap-2">
                                <DocumentBadge label="DURC" dataScadenza={sub.scadenzaDURC} />
                                <DocumentBadge label="Visura" dataScadenza={sub.scadenzaVisura} />
                                <DocumentBadge label="Polizza RCT" dataScadenza={sub.scadenzaRCT} />
                            </div>
                        </div>
                    </div>
                ))}
                
                {filtrati.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                        Nessun subappaltatore trovato. Aggiungine uno per iniziare.
                    </div>
                )}
            </div>
        </div>
    );
};