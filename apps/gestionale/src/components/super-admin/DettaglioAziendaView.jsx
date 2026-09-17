import React, { useState, useEffect } from 'react';
import { useFirebaseData } from 'shared-core';
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
    BuildingOfficeIcon, MapPinIcon, DocumentTextIcon, 
    ArrowLeftIcon, CheckCircleIcon, TrashIcon, KeyIcon,
    ExclamationTriangleIcon, NoSymbolIcon, PlayIcon
} from '@heroicons/react/24/outline';

export const DettaglioAziendaView = ({ companyId, onBack }) => {
    const { db, data } = useFirebaseData();
    const companies = data?.companies || [];
    
    // Trova l'azienda selezionata
    const company = companies.find(c => c.id === companyId);
    // 🌟 Legge lo stato di sospensione dal DB
    const isSuspended = company?.companyFeatures?.isSuspended === true;

   const [formData, setFormData] = useState({
        ragioneSociale: '',
        partitaIva: '',
        codiceFiscale: '',
        indirizzo: '',
        citta: '',
        cap: '',
        provincia: '',
        telefono: '',
        pec: '',
        codiceSdi: '',
        emailAmm: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        if (company) {
            setFormData({
                ragioneSociale: company.ragioneSociale || company.companyName || '',
                partitaIva: company.partitaIva || company.piva || '',
                codiceFiscale: company.codiceFiscale || '',
                indirizzo: company.indirizzo || '',
                citta: company.citta || '',
                cap: company.cap || '',
                provincia: company.provincia || '',
                telefono: company.telefono || '',
                pec: company.pec || '',
                codiceSdi: company.codiceSdi || '',
                emailAmm: company.emailAmm || company.email || ''
            });
        }
    }, [company]);

    if (!company) return <div className="p-8 text-center animate-pulse font-bold text-slate-500">Caricamento dati azienda...</div>;

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // --- SALVATAGGIO NORMALE ANAGRAFICA ---
    const handleSave = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMsg('');

        try {
            const companyRef = doc(db, 'companies', companyId);
            await updateDoc(companyRef, formData);
            setSuccessMsg("Dati aziendali aggiornati con successo!");
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (error) {
            console.error("Errore aggiornamento:", error);
            alert("Errore durante il salvataggio.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- AZIONE: SOSPENDI / RIATTIVA ---
    const handleToggleSuspend = async () => {
        const actionText = isSuspended ? 'RIATTIVARE' : 'SOSPENDERE';
        if (window.confirm(`Sei sicuro di voler ${actionText} questa azienda?\n\n${isSuspended ? "Gli utenti potranno accedere di nuovo al gestionale." : "Gli utenti vedranno una schermata di blocco e non potranno accedere ai loro dati."}`)) {
            try {
                const companyRef = doc(db, 'companies', companyId);
                await updateDoc(companyRef, {
                    'companyFeatures.isSuspended': !isSuspended
                });
            } catch (error) {
                console.error("Errore sospensione:", error);
                alert("Errore durante la modifica dello stato dell'azienda.");
            }
        }
    };

    // --- AZIONE: ELIMINAZIONE DISTRUTTIVA ---
    const handleDelete = async () => {
        if (window.confirm(`⚠️ PERICOLO DI ELIMINAZIONE: Sei sicuro di voler distruggere l'azienda "${company.ragioneSociale}"?\n\nVerranno eliminati permanentemente anche tutti i profili utente ad essa associati. L'azione non può essere annullata.`)) {
            try {
                // 1. Elimina gli utenti associati
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('aziendaId', '==', companyId));
                const querySnapshot = await getDocs(q);
                
                const deletePromises = [];
                querySnapshot.forEach((userDoc) => {
                    deletePromises.push(deleteDoc(doc(db, 'users', userDoc.id)));
                });
                await Promise.all(deletePromises);

                // 2. Elimina l'Azienda
                await deleteDoc(doc(db, 'companies', companyId));
                
                alert("Azienda e utenti associati eliminati con successo.");
                onBack(); // Torna alla lista
            } catch (error) {
                console.error("Errore eliminazione a cascata:", error);
                alert("Impossibile eliminare l'azienda a causa di un errore nel server.");
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up pb-10">
            {/* HEADER */}
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors shadow-sm">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Modifica Anagrafica</h1>
                            {isSuspended && (
                                <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-red-200 flex items-center gap-1">
                                    <NoSymbolIcon className="h-3 w-3" /> Sospesa
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">ID Tenant: {companyId}</p>
                    </div>
                </div>
            </div>

            {/* MODULO ANAGRAFICA */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <form onSubmit={handleSave} className="p-6 md:p-8 space-y-8">
                    {successMsg && (
                        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 flex items-center gap-3 font-bold animate-fade-in">
                            <CheckCircleIcon className="h-6 w-6 shrink-0" />
                            {successMsg}
                        </div>
                    )}

                    {/* CREDENZIALI IN CHIARO (Se presenti) */}
                    {(company.emailAccesso || company.passwordTemporanea) && (
                        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-6 relative overflow-hidden">
                            <KeyIcon className="absolute -right-4 -bottom-4 h-24 w-24 text-rose-500/10" />
                            <h3 className="text-sm font-black text-rose-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-rose-200/50 pb-2">
                                <KeyIcon className="h-5 w-5 text-rose-600" /> Credenziali di Primo Accesso
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                                <div>
                                    <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Titolare</label>
                                    <p className="font-black text-rose-900 text-lg">{company.nomeReferente} {company.cognomeReferente}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Email (Login)</label>
                                    <p className="font-bold text-rose-800 bg-white/50 px-3 py-1.5 rounded-lg border border-rose-200 inline-block">{company.emailAccesso}</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-rose-500 uppercase mb-1">Password Provvisoria</label>
                                    <p className="font-mono font-black text-rose-800 bg-white/50 px-3 py-1.5 rounded-lg border border-rose-200 inline-block tracking-wider">{company.passwordTemporanea}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DATI PRINCIPALI */}
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <BuildingOfficeIcon className="h-5 w-5 text-indigo-500" /> Dati Principali
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Ragione Sociale</label>
                                <input type="text" name="ragioneSociale" required value={formData.ragioneSociale} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Partita IVA</label>
                                <input type="text" name="partitaIva" required value={formData.partitaIva} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Codice Fiscale</label>
                                <input type="text" name="codiceFiscale" value={formData.codiceFiscale} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                    </div>

                    {/* SEDE LEGALE */}
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <MapPinIcon className="h-5 w-5 text-amber-500" /> Sede Legale
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
                            <div className="md:col-span-6">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Indirizzo Completo</label>
                                <input type="text" name="indirizzo" value={formData.indirizzo} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">CAP</label>
                                <input type="text" name="cap" value={formData.cap} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Città</label>
                                <input type="text" name="citta" value={formData.citta} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Prov.</label>
                                <input type="text" name="provincia" value={formData.provincia} onChange={handleChange} maxLength="2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-center outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                    </div>

                    {/* CONTATTI */}
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <DocumentTextIcon className="h-5 w-5 text-emerald-500" /> Contatti e Fatturazione
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Email (Fatturazione)</label>
                                <input type="email" name="emailAmm" value={formData.emailAmm} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Telefono Principale</label>
                                <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Indirizzo PEC</label>
                                <input type="email" name="pec" value={formData.pec} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Codice SDI</label>
                                <input type="text" name="codiceSdi" value={formData.codiceSdi} onChange={handleChange} maxLength="7" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 uppercase outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-10 py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Salvataggio...' : 'Salva Anagrafica'}
                        </button>
                    </div>
                </form>
            </div>

            {/* 🌟 DANGER ZONE 🌟 */}
            <div className="bg-white rounded-3xl border border-red-200 overflow-hidden shadow-sm">
                <div className="bg-red-50 p-4 border-b border-red-100 flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    <h3 className="text-sm font-black text-red-800 uppercase tracking-widest">Zona Pericolosa</h3>
                </div>
                
                <div className="p-6 divide-y divide-slate-100">
                    {/* Blocco Sospensione */}
                    <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0">
                        <div>
                            <p className="font-bold text-slate-800">Sospendi Azienda (Mancato Pagamento)</p>
                            <p className="text-sm text-slate-500 mt-1">Impedisce l'accesso al gestionale a tutti gli utenti dell'azienda, preservando i dati intatti.</p>
                        </div>
                        <button 
                            onClick={handleToggleSuspend}
                            className={`shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm ${
                                isSuspended 
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200'
                            }`}
                        >
                            {isSuspended ? <><PlayIcon className="h-5 w-5"/> Riattiva Accessi</> : <><NoSymbolIcon className="h-5 w-5"/> Sospendi Accessi</>}
                        </button>
                    </div>

                    {/* Blocco Eliminazione */}
                    <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 last:pb-0">
                        <div>
                            <p className="font-bold text-slate-800">Elimina Definitivamente</p>
                            <p className="text-sm text-slate-500 mt-1">Cancella l'azienda e i profili utente in modo permanente. Questa azione non può essere annullata.</p>
                        </div>
                        <button 
                            onClick={handleDelete}
                            className="shrink-0 flex items-center gap-2 px-6 py-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 rounded-xl font-bold transition-all shadow-sm"
                        >
                            <TrashIcon className="h-5 w-5" /> Elimina Azienda
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};