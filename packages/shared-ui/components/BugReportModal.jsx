import React, { useState } from 'react';
import { createPortal } from 'react-dom'; // 🌟 1. IMPORTIAMO IL PORTAL
import { useFirebaseData } from 'shared-core';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BugAntIcon, XMarkIcon, PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

export const BugReportModal = ({ fonte = 'user_feedback', layout = 'fab' }) => {
    const { db, user, companyID } = useFirebaseData();
    const [isOpen, setIsOpen] = useState(false);
    
    const [tipoErrore, setTipoErrore] = useState('bug'); 
    const [titolo, setTitolo] = useState('');
    const [messaggio, setMessaggio] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!titolo.trim() || !messaggio.trim()) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'segnalazioniErrori'), {
                titolo: titolo,
                messaggio: messaggio,
                tipoErrore: tipoErrore,
                utenteId: user?.uid || user?.id || 'sconosciuto',
                aziendaId: companyID || null,
                stato: 'da_leggere',
                createdAt: serverTimestamp(),
                fonte: fonte 
            });

            setIsSuccess(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsSuccess(false);
                setTitolo('');
                setMessaggio('');
                setTipoErrore('bug');
            }, 2000);

        } catch (error) {
            console.error("Errore invio segnalazione:", error);
            alert("Errore di rete. Riprova più tardi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 🌟 2. PREPARIAMO IL CONTENUTO DEL MODALE
    const modalContent = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-left">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <BugAntIcon className="h-5 w-5" />
                        <h3 className="font-bold text-slate-800">Invia Segnalazione</h3>
                    </div>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5">
                    {isSuccess ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
                            <CheckCircleIcon className="h-16 w-16 text-emerald-500 mb-4" />
                            <h4 className="text-xl font-bold text-slate-800">Ricevuto!</h4>
                            <p className="text-sm text-slate-500 mt-2">La tua segnalazione è stata inviata al supporto tecnico.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo di richiesta</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['bug', 'suggerimento', 'assistenza'].map(tipo => (
                                        <button
                                            key={tipo}
                                            type="button"
                                            onClick={() => setTipoErrore(tipo)}
                                            className={`py-2 text-xs font-bold rounded-lg border capitalize transition-colors ${tipoErrore === tipo ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {tipo}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cosa succede?</label>
                                <input 
                                    type="text" 
                                    value={titolo}
                                    onChange={(e) => setTitolo(e.target.value)}
                                    placeholder="Es. Il tasto salva non funziona"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none text-slate-800"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Dettagli</label>
                                <textarea 
                                    value={messaggio}
                                    onChange={(e) => setMessaggio(e.target.value)}
                                    placeholder="Descrivi i passaggi per riprodurre il problema..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none resize-none h-24 text-slate-800"
                                    required
                                ></textarea>
                            </div>
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isSubmitting ? (
                                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <><PaperAirplaneIcon className="h-5 w-5" /> Invia Segnalazione</>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* SCELTA DEL BOTTONE */}
            {layout === 'fab' ? (
                <button
                    onClick={() => setIsOpen(true)}
                    className={`fixed bottom-6 right-6 p-3 md:p-4 rounded-full shadow-2xl z-40 transition-all duration-300 hover:scale-110 ${isOpen ? 'opacity-0 scale-50' : 'opacity-100 scale-100 bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                    title="Segnala un problema"
                >
                    <BugAntIcon className="h-6 w-6" />
                </button>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold py-2 px-4 rounded-full flex items-center gap-1 text-sm transition-colors"
                >
                    <BugAntIcon className="h-4 w-4" /> Supporto
                </button>
            )}

            {/* 🌟 3. USIAMO IL PORTAL PER RENDERIZZARE IL MODALE SOPRA A TUTTO */}
            {isOpen && createPortal(modalContent, document.body)}
        </>
    );
};