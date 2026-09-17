import React from 'react';
import { 
    ArrowLeftIcon, PencilIcon, IdentificationIcon, 
    ShieldCheckIcon, BriefcaseIcon, EnvelopeIcon, PhoneIcon 
} from '@heroicons/react/24/outline';

// Utility per estrarre le iniziali
const getInitials = (nome = '', cognome = '') => {
    return `${nome.charAt(0)}${cognome.charAt(0)}`.toUpperCase() || '👤';
};

// Mappatura Ruoli per Colori (coerente con la lista)
const ROLE_CONFIG = {
    'proprietario': { label: 'Titolare / Admin', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    'amministrazione': { label: 'Amministrazione', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    'tecnico': { label: 'Tecnico / Geometra', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    'preposto': { label: 'Preposto / Caposquadra', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    'operaio': { label: 'Operaio', color: 'bg-green-100 text-green-800 border-green-200' },
    'default': { label: 'Non Definito', color: 'bg-gray-100 text-gray-800 border-gray-200' }
};

// Componentino riutilizzabile per mostrare i dati in modo pulito
const DetailItem = ({ label, value, isMonospace = false }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    return (
        <div>
            <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</dt>
            <dd className={`text-sm font-medium text-gray-900 ${isMonospace ? 'font-mono' : ''}`}>{displayValue}</dd>
        </div>
    );
};

export const PersonnelDetailView = ({ person, onBack, onEdit }) => { 
    const conf = ROLE_CONFIG[person.ruolo] || ROLE_CONFIG['default'];

    return (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200 animate-fade-in-down max-h-[85vh] overflow-y-auto max-w-4xl mx-auto">
            
            {/* HEADER PROFILO */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-5">
                    {/* AVATAR */}
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md ring-4 ring-indigo-50">
                        {getInitials(person.nome, person.cognome)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">
                            {person.nome} {person.cognome}
                        </h2>
                        <div className="mt-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${conf.color}`}>
                                {conf.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => onEdit(person)}
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                        <PencilIcon className="h-4 w-4" />
                        Modifica Profilo
                    </button>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 shadow-sm transition-colors"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Indietro
                    </button>
                </div>
            </div>

            {/* SEZIONI DATI */}
            <div className="space-y-6">
                
                {/* Dati Anagrafici */}
                <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                        <IdentificationIcon className="h-5 w-5 text-indigo-500"/> Dati Anagrafici
                    </h3>
                    <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <DetailItem label="Nome Completo" value={`${person.nome} ${person.cognome}`} />
                        <DetailItem label="Codice Fiscale" value={person.codiceFiscale} isMonospace={true} />
                        <DetailItem label="Data di Nascita" value={person.dataNascita ? new Date(person.dataNascita).toLocaleDateString('it-IT') : null} />
                    </dl>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contatti e App */}
                    <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-200 pb-2">
                            <ShieldCheckIcon className="h-5 w-5 text-indigo-500"/> Contatti e Accesso
                        </h3>
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><EnvelopeIcon className="h-3 w-3"/> Email (Login)</dt>
                                <dd className="text-sm font-medium text-gray-900">{person.email || 'Nessuna email'}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1"><PhoneIcon className="h-3 w-3"/> Telefono Aziendale</dt>
                                <dd className="text-sm font-medium text-gray-900">{person.telefono || 'Nessun telefono'}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Inquadramento e Costi */}
                    <div className="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                        <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2 border-b border-indigo-100 pb-2">
                            <BriefcaseIcon className="h-5 w-5 text-indigo-600"/> Inquadramento Aziendale
                        </h3>
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Ruolo Operativo</dt>
                                <dd className="text-sm font-extrabold text-indigo-900 capitalize">{person.ruolo || 'Non assegnato'}</dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Costo Orario</dt>
                                <dd className="text-lg font-extrabold text-indigo-700">
                                    {person.costoOrario ? `€ ${Number(person.costoOrario).toFixed(2)} /h` : 'Non impostato'}
                                </dd>
                                <p className="text-[10px] text-indigo-500 mt-1">Utilizzato per il calcolo costi manodopera in cantiere.</p>
                            </div>
                        </dl>
                    </div>
                </div>

            </div>
        </div>
    );
};