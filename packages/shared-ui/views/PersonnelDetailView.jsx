import React from 'react';
import { ArrowLeftIcon, DocumentTextIcon, PencilIcon } from '@heroicons/react/24/solid';

const DetailItem = ({ label, value }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    return (
        <div>
            <dt className="text-sm font-medium text-gray-500">{label}</dt>
            <dd className="mt-1 text-sm text-gray-900">{displayValue}</dd>
        </div>
    );
};

export const PersonnelDetailView = ({ person, onBack, onEdit }) => { 
    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                    Dettaglio: {person.nome} {person.cognome}
                </h2>
                <div className="flex gap-4">
                    {/* 2. Aggiungi il pulsante "Modifica" */}
                    <button
                        onClick={() => onEdit(person)} // Chiama la funzione onEdit quando cliccato
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <PencilIcon className="h-4 w-4" />
                        Modifica
                    </button>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Indietro
                    </button>
                </div>
            </div>

            {/* Il resto della vista di dettaglio rimane invariato */}
            <div className="space-y-8">
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
                    <DetailItem label="Nome Completo" value={`${person.nome} ${person.cognome}`} />
                    <DetailItem label="Email" value={person.email} />
                    {/* ... tutti gli altri DetailItem ... */}
                </dl>
                {/* ... altre sezioni ... */}
            </div>
        </div>
    );
};


