import React, { useState, useEffect } from 'react';
import { useClientsManager, clientSchema } from 'shared-core';
import { useFirebaseData } from 'shared-core';
import { ActionButtons } from 'shared-ui';
import { 
    UserIcon, TrashIcon, PlusIcon, EnvelopeIcon, 
    IdentificationIcon, MapPinIcon, KeyIcon, GlobeAltIcon
} from '@heroicons/react/24/outline';

import { getApp, initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export const AddClientForm = ({ existingData, companyIdToAdd, onBack }) => {
    const { db, user } = useFirebaseData();
    const { addClient, updateClient, isLoading, message, isError } = useClientsManager(db, user);
    
    const isEditMode = !!existingData;

    const getInitialFormData = () => {
        const defaults = JSON.parse(JSON.stringify(clientSchema));
        if (isEditMode) {
            return {
                ...defaults,
                ...existingData,
                referenti: existingData.referenti || [], 
                referente: { ...defaults.referente, ...existingData.referente },
                sedeLegale: { ...defaults.sedeLegale, ...existingData.sedeLegale },
                sedeOperativa: { ...defaults.sedeOperativa, ...existingData.sedeOperativa },
                abilitaPortale: existingData.abilitaPortale || false,
                emailAccessoPortale: existingData.emailAccessoPortale || '', 
                passwordPortale: existingData.passwordPortale || ''
            };
        }
        return { 
            ...defaults, 
            referenti: [],
            abilitaPortale: false,
            emailAccessoPortale: '', 
            passwordPortale: '' 
        };
    };

    const [formData, setFormData] = useState(getInitialFormData());
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }

        if (name === 'tipoCliente') {
            const newInitialData = JSON.parse(JSON.stringify(clientSchema));
            setFormData({ 
                ...newInitialData, 
                tipoCliente: value,
                referenti: formData.referenti,
                referente: formData.referente,
                sedeLegale: formData.sedeLegale,
                sedeOperativa: formData.sedeOperativa,
                abilitaPortale: formData.abilitaPortale,
                emailAccessoPortale: formData.emailAccessoPortale, 
                passwordPortale: formData.passwordPortale
            });
            return;
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAddReferenteRow = () => {
        const newRef = { nome: '', cognome: '', email: '', telefono: '', context: 'Manuale' };
        setFormData(prev => ({ ...prev, referenti: [...prev.referenti, newRef] }));
    };

    const handleReferenteChange = (index, field, value) => {
        const updatedRefs = [...formData.referenti];
        updatedRefs[index][field] = value;
        setFormData(prev => ({ ...prev, referenti: updatedRefs }));
    };

    const handleRemoveReferenteRow = (index) => {
        const updatedRefs = formData.referenti.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, referenti: updatedRefs }));
    };

    const generaPassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let pass = "";
        for (let i = 0; i < 10; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, passwordPortale: pass, abilitaPortale: true }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.abilitaPortale) {
            if (!formData.emailAccessoPortale || !formData.emailAccessoPortale.includes('@')) {
                alert("ATTENZIONE: Per abilitare il Portale Clienti devi inserire un'Email di Accesso valida.");
                return;
            }
            if (!formData.passwordPortale || formData.passwordPortale.length < 6) {
                alert("ATTENZIONE: La password del portale deve avere almeno 6 caratteri.");
                return;
            }

            setIsCreatingUser(true);
            try {
                const currentApp = getApp(); 
                let secondaryApp;
                try {
                    secondaryApp = getApp("SecondaryApp");
                } catch (e) {
                    secondaryApp = initializeApp(currentApp.options, "SecondaryApp");
                }
                
                const secondaryAuth = getAuth(secondaryApp);
                
                const userCred = await createUserWithEmailAndPassword(
                    secondaryAuth, 
                    formData.emailAccessoPortale, 
                    formData.passwordPortale
                );
                
                const companyIdDaAssegnare = companyIdToAdd || user?.companyId || user?.aziendaId || user?.companyID || '';

                await setDoc(doc(db, 'users', userCred.user.uid), {
                    email: formData.emailAccessoPortale,
                    role: 'cliente', 
                    ruolo: 'cliente', 
                    companyId: companyIdDaAssegnare,
                    aziendaId: companyIdDaAssegnare,
                    companyID: companyIdDaAssegnare,
                    nome: formData.ragioneSociale || formData.nome || 'Cliente',
                    cognome: formData.cognome || '',
                    createdAt: new Date().toISOString()
                });

                await signOut(secondaryAuth);

            } catch (authError) {
                // 🌟 GESTIONE CORRETTA: BLOCCA E AVVISA SE L'EMAIL ESISTE GIA'
                if (authError.code === 'auth/email-already-in-use') {
                    alert("ATTENZIONE: Questa email ha già un account di accesso registrato nel sistema! \n\nPer risolvere: usa un'email diversa per questo cliente.");
                    setIsCreatingUser(false);
                    return; 
                } else {
                    console.error("Errore Auth:", authError);
                    alert("Si è verificato un errore nella creazione dell'account Firebase: " + authError.message);
                    setIsCreatingUser(false);
                    return; 
                }
            }
            setIsCreatingUser(false);
        }

        const success = isEditMode
            ? await updateClient(existingData.id, formData)
            : await addClient(formData, companyIdToAdd);
            
        if (success) onBack();
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto border border-slate-200">
            <h2 className="text-2xl font-black text-slate-800 mb-6 border-b pb-4 tracking-tight">
                {isEditMode ? `Modifica Cliente` : 'Aggiungi Nuovo Cliente'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* 🌟 BOX PORTALE CLIENTI 🌟 */}
                <fieldset className={`p-5 rounded-2xl border-2 transition-all ${formData.abilitaPortale ? 'bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-100' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                        <legend className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${formData.abilitaPortale ? 'text-indigo-700' : 'text-gray-500'}`}>
                            <GlobeAltIcon className="h-5 w-5"/> Accesso Portale Clienti
                        </legend>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                name="abilitaPortale" 
                                checked={formData.abilitaPortale} 
                                onChange={handleChange} 
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                    
                    <p className={`text-xs font-medium mb-4 ${formData.abilitaPortale ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {formData.abilitaPortale 
                            ? "Scegli un'email e una password specifiche che il cliente userà per accedere al portale." 
                            : "Attiva l'interruttore per creare un account Auth e permettere al cliente di seguire i lavori."}
                    </p>

                    {formData.abilitaPortale && (
                        <div className="animate-fade-in-down flex flex-col md:flex-row gap-4 items-end bg-white p-4 rounded-xl border border-indigo-100">
                            <div className="flex-1 w-full">
                                <InputField 
                                    label="Email di Accesso (Login)" 
                                    name="emailAccessoPortale" 
                                    type="email"
                                    value={formData.emailAccessoPortale} 
                                    onChange={handleChange} 
                                    placeholder="Es. geometra@azienda.com"
                                    required={formData.abilitaPortale}
                                />
                            </div>
                            <div className="flex-1 w-full relative">
                                <InputField 
                                    label="Password di Accesso" 
                                    name="passwordPortale" 
                                    value={formData.passwordPortale} 
                                    onChange={handleChange} 
                                    placeholder="Inserisci o genera..."
                                    required={formData.abilitaPortale}
                                />
                                <button 
                                    type="button" 
                                    onClick={generaPassword}
                                    className="absolute right-2 top-6 text-xs font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded"
                                >
                                    Genera
                                </button>
                            </div>
                        </div>
                    )}
                </fieldset>

                {/* 2. TIPO CLIENTE */}
                <fieldset className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Configurazione Profilo</label>
                    <select name="tipoCliente" value={formData.tipoCliente} onChange={handleChange} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                        <option value="Azienda">Azienda / P.IVA</option>
                        <option value="Ente Pubblico">Ente Pubblico</option>
                        <option value="Privato">Privato / Persona Fisica</option>
                    </select>
                </fieldset>

                {/* 3. DATI FISCALI / ANAGRAFICI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {['Azienda', 'Ente Pubblico'].includes(formData.tipoCliente) ? (
                        <>
                            <div className="md:col-span-2">
                                <InputField label="Ragione Sociale" name="ragioneSociale" value={formData.ragioneSociale || ''} onChange={handleChange} required />
                            </div>
                            <InputField label="Partita IVA" name="piva" value={formData.piva || ''} onChange={handleChange} />
                            <InputField label="Codice Fiscale" name="cf" value={formData.cf || ''} onChange={handleChange} />
                            <InputField label="Codice SDI" name="sdi" value={formData.sdi || ''} onChange={handleChange} maxLength={7} />
                            <InputField label="PEC" name="pec" type="email" value={formData.pec || ''} onChange={handleChange} />
                        </>
                    ) : (
                        <>
                            <InputField label="Nome" name="nome" value={formData.nome || ''} onChange={handleChange} required />
                            <InputField label="Cognome" name="cognome" value={formData.cognome || ''} onChange={handleChange} required />
                            <div className="md:col-span-2">
                                <InputField label="Codice Fiscale" name="cf" value={formData.cf || ''} onChange={handleChange} />
                            </div>
                        </>
                    )}
                </div>

                {/* 4. REFERENTE PRINCIPALE */}
                <fieldset className="border-t pt-6">
                    <legend className="text-sm font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <UserIcon className="h-4 w-4"/> Contatto Principale (Amministrazione)
                    </legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField label="Nome" name="referente.nome" value={formData.referente?.nome || ''} onChange={handleChange} />
                        <InputField label="Cognome" name="referente.cognome" value={formData.referente?.cognome || ''} onChange={handleChange} />
                        <InputField label="Email Fatturazione/Comunicazioni" name="referente.email" type="email" value={formData.referente?.email || ''} onChange={handleChange} />
                        <InputField label="Telefono" name="referente.telefono" type="tel" value={formData.referente?.telefono || ''} onChange={handleChange} />
                    </div>
                </fieldset>

                {/* 5. ELENCO REFERENTI EXTRA */}
                <fieldset className="border-t pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <legend className="text-sm font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                            <PlusIcon className="h-4 w-4"/> Altri Contatti / Storico Offerte
                        </legend>
                        <button type="button" onClick={handleAddReferenteRow} className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
                            AGGIUNGI CONTATTO
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {formData.referenti.map((ref, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 relative group animate-fade-in">
                                <button type="button" onClick={() => handleRemoveReferenteRow(idx)} className="absolute -top-2 -right-2 p-1.5 bg-white text-red-500 rounded-full border border-red-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <InputField label="Nome e Cognome" value={`${ref.nome} ${ref.cognome}`} onChange={(e) => {
                                        const [n, ...c] = e.target.value.split(' ');
                                        handleReferenteChange(idx, 'nome', n || '');
                                        handleReferenteChange(idx, 'cognome', c.join(' ') || '');
                                    }} />
                                    <InputField label="Email" value={ref.email} onChange={(e) => handleReferenteChange(idx, 'email', e.target.value)} />
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <InputField label="Telefono" value={ref.telefono} onChange={(e) => handleReferenteChange(idx, 'telefono', e.target.value)} />
                                        </div>
                                        <div className="w-24 text-[10px] flex flex-col justify-end">
                                            <span className="bg-white border px-2 py-1 rounded text-slate-400 font-bold truncate" title={ref.context}>{ref.context || 'N/D'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {formData.referenti.length === 0 && (
                            <p className="text-xs text-slate-400 italic text-center py-2">Nessun referente secondario registrato.</p>
                        )}
                    </div>
                </fieldset>

                {/* 6. INDIRIZZI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t pt-6">
                    <fieldset className="space-y-4">
                        <legend className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-2"><MapPinIcon className="h-4 w-4"/> Sede Legale</legend>
                        <InputField label="Via / Piazza" name="sedeLegale.via" value={formData.sedeLegale?.via || ''} onChange={handleChange} />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Città" name="sedeLegale.citta" value={formData.sedeLegale?.citta || ''} onChange={handleChange} />
                            <InputField label="CAP" name="sedeLegale.cap" value={formData.sedeLegale?.cap || ''} onChange={handleChange} />
                        </div>
                    </fieldset>
                    <fieldset className="space-y-4">
                        <legend className="text-sm font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-2"><MapPinIcon className="h-4 w-4"/> Sede Operativa</legend>
                        <InputField label="Via / Piazza" name="sedeOperativa.via" value={formData.sedeOperativa?.via || ''} onChange={handleChange} />
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Città" name="sedeOperativa.citta" value={formData.sedeOperativa?.citta || ''} onChange={handleChange} />
                            <InputField label="CAP" name="sedeOperativa.cap" value={formData.sedeOperativa?.cap || ''} onChange={handleChange} />
                        </div>
                    </fieldset>
                </div>

                <div className="pt-6 border-t">
                    <ActionButtons onBack={onBack} isSaving={isLoading || isCreatingUser} saveLabel={isEditMode ? 'Aggiorna Cliente' : 'Crea Anagrafica e Accesso'} />
                </div>
            </form>
            
            {message && (
                <div className={`mt-6 p-4 rounded-xl text-center font-bold text-sm ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message}
                </div>
            )}
        </div>
    );
};

const InputField = ({ label, ...props }) => (
    <div className="flex-1">
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">{label}</label>
        <input 
            className="w-full px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            {...props}
        />
    </div>
);