import React from 'react';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/solid';

// Componente helper per mostrare una coppia etichetta-valore
const DetailItem = ({ label, value }) => {
    // Non mostra nulla se il valore è mancante o vuoto
    if (!value) return null;
    return (
        <div>
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900">{value}</dd>
        </div>
    );
};

// Componente principale per la vista di dettaglio del cliente
export const ClientDetailView = ({ client, onBack, onEdit }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in max-h-[85vh] overflow-y-auto">
            {/* Header con titolo e pulsanti di azione */}
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Dettaglio: {client.ragioneSociale}</h2>
                <div className="flex gap-4">
                    <button 
                        onClick={() => onEdit(client)} 
                        className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <PencilIcon className="h-4 w-4" /> Modifica
                    </button>
                    <button 
                        onClick={onBack} 
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeftIcon className="h-4 w-4" /> Indietro
                    </button>
                </div>
            </div>
            
            <div className="space-y-8">
                {/* --- Sezione Dati Fiscali e Contatti --- */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Dati Fiscali e Contatti</h3>
                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
                        <DetailItem label="Ragione Sociale" value={client.ragioneSociale} />
                        <DetailItem label="Partita IVA" value={client.piva} />
                        <DetailItem label="Codice Fiscale" value={client.cf} />
                        <DetailItem label="Codice SDI" value={client.sdi} />
                        <DetailItem label="Indirizzo PEC" value={client.pec} />
                    </dl>
                </div>

                {/* --- Sezione Referente --- */}
                <div className="border-t pt-6">
                     <h3 className="text-lg font-semibold text-gray-700 mb-4">Referente</h3>
                     <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
                        <DetailItem label="Nome Completo" value={`${client.referente?.nome || ''} ${client.referente?.cognome || ''}`.trim()} />
                        <DetailItem label="Email Referente" value={client.referente?.email} />
                        <DetailItem label="Telefono Referente" value={client.referente?.telefono} />
                     </dl>
                </div>

                {/* --- Sezione Indirizzi --- */}
                <div className="border-t pt-6">
                     <h3 className="text-lg font-semibold text-gray-700 mb-4">Indirizzi</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                             <h4 className="font-medium text-gray-600">Sede Legale</h4>
                             <p className="text-sm text-gray-800">{client.sedeLegale?.via}</p>
                             <p className="text-sm text-gray-800">{client.sedeLegale?.citta} ({client.sedeLegale?.cap})</p>
                        </div>
                         <div>
                             <h4 className="font-medium text-gray-600">Sede Operativa</h4>
                             <p className="text-sm text-gray-800">{client.sedeOperativa?.via}</p>
                             <p className="text-sm text-gray-800">{client.sedeOperativa?.citta} ({client.sedeOperativa?.cap})</p>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

