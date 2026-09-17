import React, { useState } from 'react';
import ReactDOM from 'react-dom'; 
import { 
    XMarkIcon, CalendarDaysIcon, PaperAirplaneIcon, 
    ClockIcon, CheckCircleIcon, XCircleIcon, ChatBubbleLeftRightIcon
} from '@heroicons/react/24/solid';

export const RichiestaFerieModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    isSending,
    mieRichieste = [] // ✅ NUOVA PROP: Lista delle richieste dell'utente
}) => {
    
    const [activeTab, setActiveTab] = useState('nuova'); // 'nuova' | 'storico'
    const [formData, setFormData] = useState({
        tipo: 'ferie',
        dataInizio: '',
        dataFine: '',
        ore: '', 
        note: ''
    });

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSave(formData);
        // Reset form opzionale
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const formatDate = (d) => {
        if(!d) return '-';
        const date = d.toDate ? d.toDate() : new Date(d);
        return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    };

    const renderStato = (req) => {
        if (req.stato === 'approvata') return <span className="flex items-center text-green-600 font-bold text-sm"><CheckCircleIcon className="h-5 w-5 mr-1"/> Approvata</span>;
        if (req.stato === 'rifiutata') return <span className="flex items-center text-red-600 font-bold text-sm"><XCircleIcon className="h-5 w-5 mr-1"/> Rifiutata</span>;
        return <span className="flex items-center text-yellow-600 font-bold text-sm"><ClockIcon className="h-5 w-5 mr-1"/> In Attesa</span>;
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-90 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-4 bg-blue-600 text-white flex justify-between items-center shrink-0">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <CalendarDaysIcon className="h-6 w-6" /> Gestione Assenze
                    </h2>
                    <button onClick={onClose}><XMarkIcon className="h-6 w-6" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-gray-50 shrink-0">
                    <button 
                        onClick={() => setActiveTab('nuova')}
                        className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${activeTab === 'nuova' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        Nuova Richiesta
                    </button>
                    <button 
                        onClick={() => setActiveTab('storico')}
                        className={`flex-1 py-3 text-sm font-bold text-center transition-colors ${activeTab === 'storico' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        Le mie Richieste
                    </button>
                </div>
                
                {/* Contenuto Scrollabile */}
                <div className="p-6 overflow-y-auto flex-1">
                    
                    {/* --- TAB 1: NUOVA RICHIESTA --- */}
                    {activeTab === 'nuova' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                <select name="tipo" value={formData.tipo} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900">
                                    <option value="ferie">🏖️ Ferie</option>
                                    <option value="permesso">⏱️ Permesso Orario</option>
                                    <option value="malattia">🤒 Malattia</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dal</label>
                                    <input type="date" name="dataInizio" value={formData.dataInizio} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Al</label>
                                    <input type="date" name="dataFine" value={formData.dataFine} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" />
                                </div>
                            </div>

                            {formData.tipo === 'permesso' && (
                                <div className="animate-fade-in">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ore Richieste</label>
                                    <input type="number" name="ore" value={formData.ore} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" placeholder="Es. 2" />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                                <textarea name="note" value={formData.note} onChange={handleChange} className="w-full p-3 border border-gray-300 rounded-lg" rows={3} placeholder="Opzionale..." />
                            </div>

                            <button onClick={handleSubmit} disabled={isSending} className="w-full mt-4 py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-md">
                                {isSending ? 'Invio...' : <><PaperAirplaneIcon className="h-5 w-5"/> Invia Richiesta</>}
                            </button>
                        </div>
                    )}

                    {/* --- TAB 2: STORICO --- */}
                    {activeTab === 'storico' && (
                        <div className="space-y-3">
                            {mieRichieste.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">Nessuna richiesta effettuata.</p>
                            ) : (
                                // Ordina per data decrescente (più recenti in alto)
                                [...mieRichieste].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(req => (
                                    <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-bold text-gray-900 capitalize">{req.tipo}</p>
                                                <p className="text-sm text-gray-500">
                                                    {formatDate(req.dataInizio)} → {formatDate(req.dataFine)}
                                                    {req.ore > 0 && ` (${req.ore}h)`}
                                                </p>
                                            </div>
                                            {renderStato(req)}
                                        </div>
                                        
                                        {/* Note Utente */}
                                        {req.note && <p className="text-xs text-gray-600 italic mb-2">"{req.note}"</p>}

                                       {/* Risposta Admin */}
                                        {(req.noteAdmin || req.nomeApprovatore) && (
                                            <div className="mt-2 pt-2 border-t border-gray-100 bg-gray-50 p-2 rounded-lg">
                                                <div className="flex gap-2 items-start">
                                                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5"/>
                                                    <div>
                                                        {/* ✅ MOSTRA CHI HA APPROVATO */}
                                                        <p className="text-xs font-bold text-indigo-900">
                                                            {req.stato === 'approvata' ? 'Approvata da:' : 'Gestita da:'} {req.nomeApprovatore || 'Ufficio'}
                                                        </p>
                                                        
                                                        {/* Mostra nota se presente */}
                                                        {req.noteAdmin && (
                                                            <p className="text-xs text-gray-700 mt-1">"{req.noteAdmin}"</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>,
        document.body
    );
};