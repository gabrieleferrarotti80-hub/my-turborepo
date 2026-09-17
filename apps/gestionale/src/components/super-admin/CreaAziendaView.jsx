import React, { useState } from 'react';
import { BuildingOfficeIcon, PlusCircleIcon, CheckCircleIcon, MapPinIcon, DocumentTextIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export const CreaAziendaView = () => {
    const [formData, setFormData] = useState({
        ragioneSociale: '',
        partitaIva: '',
        codiceFiscale: '',
        indirizzo: '',
        citta: '',
        cap: '',
        provincia: '',
        nomeReferente: '',
        cognomeReferente: '', // Aggiunto per l'endpoint server
        email: '',
        telefono: '',
        pec: '',
        codiceSdi: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Genera una password provvisoria (es. Rossi2024!)
    const generateTempPassword = (ragioneSociale) => {
        const cleanName = ragioneSociale.replace(/[^a-zA-Z]/g, '').substring(0, 6);
        const year = new Date().getFullYear();
        return `${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}${year}!`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
          // 1. Prepariamo i dati dell'Azienda (Tenant)
            const tempPassword = generateTempPassword(formData.ragioneSociale); // Lo spostiamo qui su!

            const companyData = {
                ragioneSociale: formData.ragioneSociale,
                partitaIva: formData.partitaIva,
                codiceFiscale: formData.codiceFiscale,
                indirizzo: formData.indirizzo,
                citta: formData.citta,
                cap: formData.cap,
                provincia: formData.provincia,
                telefono: formData.telefono,
                pec: formData.pec,
                codiceSdi: formData.codiceSdi,
                
                // 🌟 NOVITÀ: Salviamo in chiaro i dati di accesso per l'Admin
                nomeReferente: formData.nomeReferente,
                cognomeReferente: formData.cognomeReferente,
                emailAccesso: formData.email.toLowerCase().trim(),
                passwordTemporanea: tempPassword, // Salvata nel DB per poterla rileggere!

                companyFeatures: { isPro: false }, 
                activeModules: {
                    magazzino: true, personale: true, cantieri: true,
                    fatturazione: true, programmazione: true, sicurezza: true
                }
            };

            // 2. Prepariamo i dati dell'Utente (Authentication)
            const userData = {
                nome: formData.nomeReferente || 'Admin',
                cognome: formData.cognomeReferente || formData.ragioneSociale,
                email: formData.email.toLowerCase().trim(),
                password: tempPassword 
            };

            // 3. Chiamata HTTP POST al tuo Backend Node.js
            const response = await fetch('http://localhost:3002/createUserAndCompany', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ companyData, userData })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Errore dal server');
            }

            // SUCCESSO!
            setSuccessMsg(`L'azienda "${formData.ragioneSociale}" è stata creata! Password temporanea: ${tempPassword}`);
            
            // Reset del form
            setFormData({
                ragioneSociale: '', partitaIva: '', codiceFiscale: '',
                indirizzo: '', citta: '', cap: '', provincia: '',
                nomeReferente: '', cognomeReferente: '', email: '', telefono: '',
                pec: '', codiceSdi: ''
            });
            
        } catch (error) {
            console.error("Errore creazione SaaS:", error);
            setErrorMsg(error.message || "Si è verificato un errore di connessione al server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in-up pb-10">
            <div className="mb-6 shrink-0">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <PlusCircleIcon className="h-8 w-8 text-indigo-600" />
                    Registra Nuovo Cliente
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    Compila l'anagrafica. Il sistema creerà l'azienda e l'utente Titolare in Firebase Auth.
                </p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
                    
                    {/* MESSAGGI DI ESITO */}
                    {successMsg && (
                        <div className="bg-emerald-50 text-emerald-800 p-5 rounded-xl border border-emerald-200 flex flex-col gap-1 font-medium animate-fade-in">
                            <div className="flex items-center gap-2 font-black text-lg">
                                <CheckCircleIcon className="h-6 w-6 shrink-0" /> Azienda Attivata!
                            </div>
                            <p>{successMsg}</p>
                            <p className="text-xs mt-2 text-emerald-600">Comunica questa password al cliente. Potrà cambiarla al primo accesso.</p>
                        </div>
                    )}
                    {errorMsg && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 font-bold">
                            {errorMsg}
                        </div>
                    )}

                    {/* SEZIONE 1: DATI PRINCIPALI */}
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <BuildingOfficeIcon className="h-5 w-5 text-indigo-500" /> Dati Principali
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Ragione Sociale *</label>
                                <input type="text" name="ragioneSociale" required value={formData.ragioneSociale} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Es. Rossi Costruzioni S.p.A." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Partita IVA *</label>
                                <input type="text" name="partitaIva" required value={formData.partitaIva} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Codice Fiscale</label>
                                <input type="text" name="codiceFiscale" value={formData.codiceFiscale} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Se diverso da P.IVA" />
                            </div>
                        </div>
                    </div>

                    {/* SEZIONE 2: SEDE LEGALE */}
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <MapPinIcon className="h-5 w-5 text-amber-500" /> Sede Legale
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-5">
                            <div className="md:col-span-6">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Indirizzo Completo</label>
                                <input type="text" name="indirizzo" value={formData.indirizzo} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Via, Piazza, ecc." />
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
                                <input type="text" name="provincia" value={formData.provincia} onChange={handleChange} maxLength="2" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase text-center outline-none focus:ring-2 focus:ring-indigo-500" placeholder="MI" />
                            </div>
                        </div>
                    </div>

                    {/* SEZIONE 3: CONTATTI E AUTHENTICATION */}
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                            <DocumentTextIcon className="h-5 w-5 text-emerald-500" /> Contatti e Credenziali
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nome Referente *</label>
                                <input type="text" name="nomeReferente" required value={formData.nomeReferente} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Cognome Referente *</label>
                                <input type="text" name="cognomeReferente" required value={formData.cognomeReferente} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1.5">Email di Accesso (Login) *</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full p-3 bg-indigo-50 border border-indigo-200 rounded-xl font-bold text-indigo-800 outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Telefono</label>
                                <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Indirizzo PEC</label>
                                <input type="email" name="pec" value={formData.pec} onChange={handleChange} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                                    <EnvelopeIcon className="h-3 w-3" /> Codice Destinatario (SDI)
                                </label>
                                <input type="text" name="codiceSdi" value={formData.codiceSdi} onChange={handleChange} maxLength="7" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 uppercase outline-none focus:ring-2 focus:ring-indigo-500" placeholder="7 Caratteri" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-100 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="bg-slate-900 hover:bg-black text-white font-black px-10 py-3.5 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting ? 'Creazione in corso...' : <><PlusCircleIcon className="h-5 w-5" /> Registra Azienda nel Sistema</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};