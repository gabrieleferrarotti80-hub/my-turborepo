import React, { useState } from 'react';
import { usePersonnelManager, userSchema, useFirebaseData } from 'shared-core';
import { ActionButtons, SignatureModal } from 'shared-ui'; 
import { DocumentTextIcon, IdentificationIcon, CreditCardIcon, AcademicCapIcon, PlusIcon, TrashIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export const AddPersonnelForm = ({ existingData, companyIdToAdd, onBack }) => {
    
    const { auth, db, storage } = useFirebaseData();
    const { addPersonnel, updatePersonnel, isLoading, message, isError } = usePersonnelManager(db, storage); 
    const isEditMode = !!existingData;

    // --- ELENCO CORSI STANDARD RICHIESTI ---
    const corsiMonitorati = [
        { id: 'sicurezza_lavoratori', label: 'Sicurezza Lavoratori (D.Lgs. 81/08)' },
        { id: 'primo_soccorso_antincendio', label: 'Primo Soccorso e Antincendio' },
        { id: 'manutentore_verde', label: 'Manutentore del Verde (L. 154/2016)' },
        { id: 'attrezzature_art_73', label: 'Uso attrezzature (Art. 73 D.Lgs. 81/08)' },
        { id: 'mmt', label: 'Macchine Movimento Terra' },
        { id: 'scale_aeree', label: 'Scale aeree / autoscale' },
        { id: 'lavori_quota_dpi3', label: 'Lavori in Quota e DPI 3ª Cat.' },
        { id: 'tree_climbing', label: 'Tree Climbing (Modulo B)' }
    ];

    const getInitialFormData = () => {
        const defaults = { 
            ...userSchema,
            nazionalita: 'Italiana',
            telefonoPrivato: '',
            telefonoAziendale: '',
            numeroPermessoSoggiorno: '',
            domicilioUgualeResidenza: true,
            domicilio: { via: '', cap: '', citta: '' },
            documentiPersonali: { 
                patente: { tipologia: '' },
                scadenze: { permessoSoggiorno: '', patente: '', cartaIdentita: '' },
                corsiExtra: [] 
            }
        };

        if (isEditMode) {
            const hasDomicilio = existingData?.domicilio && (existingData.domicilio.via || existingData.domicilio.citta);
            const isUguale = existingData.domicilioUgualeResidenza !== undefined 
                ? existingData.domicilioUgualeResidenza 
                : !hasDomicilio;
            
            return { 
                ...defaults, 
                ...existingData, 
                domicilioUgualeResidenza: isUguale,
                firma_base64: existingData.firma_base64 || existingData.firmaUrl || existingData.firma || null,
                documentiPersonali: {
                    ...defaults.documentiPersonali,
                    ...(existingData.documentiPersonali || {}),
                    patente: {
                        ...defaults.documentiPersonali.patente,
                        ...(existingData.documentiPersonali?.patente || {})
                    },
                    scadenze: {
                        ...defaults.documentiPersonali.scadenze,
                        ...(existingData.documentiPersonali?.scadenze || {})
                    },
                    corsiExtra: existingData.documentiPersonali?.corsiExtra || [] 
                }
            };
        }
        defaults.password = '';
        return defaults;
    };

    const [formData, setFormData] = useState(getInitialFormData());
    
    const [filesToUpload, setFilesToUpload] = useState([]);
    // In docFiles finiranno Patente, CI, e ora anche TUTTI gli attestati dei corsi
    const [docFiles, setDocFiles] = useState({
        cartaIdentita: null,
        codiceFiscale: null,
        patente: null,
        permessoSoggiorno: null
    });

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        
        if (name.includes('.')) {
            const keys = name.split('.');
            setFormData(prev => {
                const newData = { ...prev };
                let current = newData;
                for (let i = 0; i < keys.length - 1; i++) {
                    current[keys[i]] = { ...current[keys[i]] }; 
                    current = current[keys[i]];
                }
                current[keys[keys.length - 1]] = val;
                return newData;
            });
        } else {
            setFormData(prev => ({ ...prev, [name]: val }));
        }
    };

    const addCorsoExtra = () => {
        setFormData(prev => ({
            ...prev,
            documentiPersonali: {
                ...prev.documentiPersonali,
                corsiExtra: [...(prev.documentiPersonali?.corsiExtra || []), { nome: '', scadenza: '', id: Date.now() }]
            }
        }));
    };

    const removeCorsoExtra = (id) => {
        setFormData(prev => ({
            ...prev,
            documentiPersonali: {
                ...prev.documentiPersonali,
                corsiExtra: prev.documentiPersonali.corsiExtra.filter(c => c.id !== id)
            }
        }));
    };

    const handleCorsoExtraChange = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            documentiPersonali: {
                ...prev.documentiPersonali,
                corsiExtra: prev.documentiPersonali.corsiExtra.map(c => c.id === id ? { ...c, [field]: value } : c)
            }
        }));
    };

    // ✅ Funzione universale che rinomina e salva qualsiasi file nel dizionario docFiles
    const handleDocFileChange = (e, docName) => {
        const file = e.target.files[0];
        if (file) {
            const extension = file.name.split('.').pop();
            const renamedFile = new File([file], `${docName}_${formData.nome}_${formData.cognome}.${extension}`.replace(/\s+/g, ''), { type: file.type });
            setDocFiles(prev => ({ ...prev, [docName]: renamedFile }));
        } else {
            setDocFiles(prev => ({ ...prev, [docName]: null }));
        }
    };

    const handleFileChange = (e) => {
        setFilesToUpload(Array.from(e.target.files));
    };

    const handleSaveSignature = (signatureData) => {
        let base64String = '';
        if (typeof signatureData === 'string') {
            base64String = signatureData;
        } else if (signatureData && signatureData.signature) {
            base64String = signatureData.signature;
        } else if (signatureData && signatureData.dataUrl) {
            base64String = signatureData.dataUrl;
        } else if (signatureData instanceof Blob) {
            const reader = new FileReader();
            reader.readAsDataURL(signatureData);
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, firma_base64: reader.result }));
                setIsSignatureModalOpen(false);
            };
            return;
        }

        if (base64String) {
            setFormData(prev => ({ ...prev, firma_base64: base64String }));
        } else {
            alert("Errore nell'acquisizione della firma. Formato non riconosciuto.");
        }
        setIsSignatureModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const dataToSave = { ...formData };
        if (dataToSave.domicilioUgualeResidenza) {
            dataToSave.domicilio = { ...(dataToSave.address || {}) };
        }
        
        const nat = dataToSave.nazionalita ? dataToSave.nazionalita.trim().toLowerCase() : '';
        if (!nat || nat === 'italiana' || nat === 'italiano') {
            dataToSave.numeroPermessoSoggiorno = '';
            if (dataToSave.documentiPersonali?.scadenze?.permessoSoggiorno) {
                dataToSave.documentiPersonali.scadenze.permessoSoggiorno = '';
            }
        }

        // Tutti i file (patenti, CI, corsi standard e extra) finiscono qui automaticamente
        const finalFilesToUpload = [
            ...filesToUpload,
            ...Object.values(docFiles).filter(Boolean)
        ];

        let success;
        if (isEditMode) {
            success = await updatePersonnel(existingData.id, dataToSave, finalFilesToUpload);
        } else {
            success = await addPersonnel(dataToSave, companyIdToAdd, finalFilesToUpload);
        }
        
        if (success) {
            onBack();
        }
    };

    const isForeigner = formData.nazionalita && formData.nazionalita.trim().toLowerCase() !== 'italiana' && formData.nazionalita.trim().toLowerCase() !== 'italiano';
    const hasSignature = Boolean(formData.firma_base64 || formData.firmaUrl || formData.firma);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in max-w-5xl mx-auto relative">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{isEditMode ? 'Modifica Personale' : 'Aggiungi Nuovo Personale'}</h1>
            
            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* --- SEZIONE ANAGRAFICA --- */}
                <div className="p-4 border rounded-lg bg-white shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Anagrafica & Contatti</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <InputGroup label="Nome *" name="nome" value={formData.nome} onChange={handleChange} required />
                        <InputGroup label="Cognome *" name="cognome" value={formData.cognome} onChange={handleChange} required />
                        <InputGroup label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} required />
                        {!isEditMode && <InputGroup label="Password *" name="password" type="password" value={formData.password} onChange={handleChange} required />}
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Ruolo *</label>
                            <select name="ruolo" value={formData.ruolo} onChange={handleChange} className="w-full p-2 border rounded mt-1 shadow-sm" required>
                                <option value="">Seleziona...</option>
                                <option value="titolare-azienda">Titolare Azienda</option>
                                <option value="preposto">Preposto</option>
                                <option value="tecnico">Tecnico</option>
                                <option value="amministrazione">Amministrazione</option>
                                <option value="dipendente">Dipendente</option>
                            </select>
                        </div>
                        <InputGroup label="Nazionalità" name="nazionalita" value={formData.nazionalita} onChange={handleChange} />
                        <InputGroup label="Telefono Privato" name="telefonoPrivato" type="tel" value={formData.telefonoPrivato} onChange={handleChange} />
                        <InputGroup label="Telefono Aziendale" name="telefonoAziendale" type="tel" value={formData.telefonoAziendale} onChange={handleChange} />
                    </div>
                </div>

                {/* --- ✅ SEZIONE FORMAZIONE & ABILITAZIONI CON UPLOAD INTEGRATO --- */}
                <div className="p-4 border border-indigo-100 rounded-lg bg-indigo-50/30">
                    <h2 className="text-xl font-semibold mb-4 text-indigo-900 flex items-center gap-2">
                        <AcademicCapIcon className="h-6 w-6"/> Formazione e Abilitazioni
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {corsiMonitorati.map(corso => (
                            <div key={corso.id} className="flex flex-col bg-white p-3 rounded-lg border border-gray-200 shadow-sm transition-all hover:border-indigo-300">
                                {/* Riga 1: Nome e Data */}
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-semibold text-gray-700 w-2/3">{corso.label}</label>
                                    <input 
                                        type="date" 
                                        name={`documentiPersonali.scadenze.${corso.id}`}
                                        value={formData.documentiPersonali?.scadenze?.[corso.id] || ''}
                                        onChange={handleChange}
                                        className="text-xs p-1.5 border border-indigo-200 rounded focus:ring-2 focus:ring-indigo-500 outline-none bg-white w-32"
                                    />
                                </div>
                                {/* Riga 2: File Upload */}
                                <div className="border-t border-gray-100 pt-2">
                                    <FileInput 
                                        label="Allega Attestato" 
                                        onChange={(e) => handleDocFileChange(e, corso.id)} 
                                        file={docFiles[corso.id]} 
                                        icon={<ArrowUpTrayIcon className="h-3.5 w-3.5 text-indigo-400"/>}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CORSI EXTRA MANUALI CON UPLOAD */}
                    <div className="mt-6 space-y-3">
                        <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2">
                            Altri Corsi e Certificazioni Specialistiche
                        </h3>
                        
                        {formData.documentiPersonali?.corsiExtra?.map((corso) => (
                            <div key={corso.id} className="flex flex-col bg-white p-3 rounded-lg border border-indigo-200 animate-fade-in shadow-sm gap-2">
                                {/* Riga 1: Nome, Data, Elimina */}
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Nome del corso..."
                                        value={corso.nome}
                                        onChange={(e) => handleCorsoExtraChange(corso.id, 'nome', e.target.value)}
                                        className="flex-1 text-sm p-1.5 border rounded"
                                    />
                                    <input 
                                        type="date" 
                                        value={corso.scadenza}
                                        onChange={(e) => handleCorsoExtraChange(corso.id, 'scadenza', e.target.value)}
                                        className="text-xs p-1.5 border rounded w-32"
                                    />
                                    <button type="button" onClick={() => removeCorsoExtra(corso.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors">
                                        <TrashIcon className="h-5 w-5"/>
                                    </button>
                                </div>
                                {/* Riga 2: File Upload Extra */}
                                <div className="border-t border-indigo-50 pt-2">
                                    <FileInput 
                                        label="Allega Attestato Extra" 
                                        onChange={(e) => handleDocFileChange(e, `corsoExtra_${corso.id}`)} 
                                        file={docFiles[`corsoExtra_${corso.id}`]} 
                                        icon={<ArrowUpTrayIcon className="h-3.5 w-3.5 text-indigo-400"/>}
                                    />
                                </div>
                            </div>
                        ))}

                        <button 
                            type="button" 
                            onClick={addCorsoExtra}
                            className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 p-2 transition-colors mt-2"
                        >
                            <PlusIcon className="h-5 w-5"/> Aggiungi Corso non in elenco
                        </button>
                    </div>
                </div>

                {/* --- DOCUMENTI E PATENTE --- */}
                <div className="p-4 border border-blue-100 rounded-lg bg-blue-50/20 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-blue-900 flex items-center gap-2 border-b border-blue-100 pb-2">
                        <IdentificationIcon className="h-6 w-6"/> Documenti d'Identità e Patente
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-sm font-medium text-blue-800">Tipo Patente</label>
                                    <select name="documentiPersonali.patente.tipologia" value={formData.documentiPersonali?.patente?.tipologia} onChange={handleChange} className="w-full p-2 border rounded mt-1 bg-white">
                                        <option value="">Nessuna</option>
                                        {['AM', 'A', 'B', 'BE', 'C', 'CE', 'D', 'CQC'].map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="text-sm font-medium text-blue-800">Scadenza Patente</label>
                                    <input type="date" name="documentiPersonali.scadenze.patente" value={formData.documentiPersonali?.scadenze?.patente} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                                </div>
                            </div>
                            <InputGroup label="Scadenza Carta d'Identità" name="documentiPersonali.scadenze.cartaIdentita" type="date" value={formData.documentiPersonali?.scadenze?.cartaIdentita} onChange={handleChange} />
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-blue-100 space-y-2">
                            <h4 className="font-bold text-sm text-gray-700 border-b pb-2 mb-3">Carica File (Foto o PDF)</h4>
                            <FileInput label="Carta d'Identità" onChange={(e) => handleDocFileChange(e, 'cartaIdentita')} file={docFiles.cartaIdentita} icon={<IdentificationIcon className="h-4 w-4 text-blue-500"/>} />
                            <FileInput label="Codice Fiscale" onChange={(e) => handleDocFileChange(e, 'codiceFiscale')} file={docFiles.codiceFiscale} icon={<CreditCardIcon className="h-4 w-4 text-green-500"/>} />
                            <FileInput label="Patente di Guida" onChange={(e) => handleDocFileChange(e, 'patente')} file={docFiles.patente} icon={<DocumentTextIcon className="h-4 w-4 text-orange-500"/>} />
                        </div>
                    </div>
                </div>

                {/* --- PERMESSO SOGGIORNO --- */}
                {isForeigner && (
                    <div className="p-4 border border-orange-100 rounded-lg bg-orange-50/30 animate-fade-in shadow-sm">
                        <h2 className="text-xl font-semibold mb-4 text-orange-900 border-b border-orange-100 pb-2">Dati Permesso di Soggiorno</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                            <InputGroup label="N° Permesso Soggiorno" name="numeroPermessoSoggiorno" value={formData.numeroPermessoSoggiorno} onChange={handleChange} />
                            <InputGroup label="Scadenza Permesso" name="documentiPersonali.scadenze.permessoSoggiorno" type="date" value={formData.documentiPersonali?.scadenze?.permessoSoggiorno} onChange={handleChange} />
                            <div className="bg-white p-2 border rounded">
                                <label className="block text-[10px] font-medium text-orange-900 mb-1">Carica Documento</label>
                                <input type="file" onChange={(e) => handleDocFileChange(e, 'permessoSoggiorno')} className="text-xs w-full text-orange-700 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-orange-100 file:text-orange-800" />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- INDIRIZZI --- */}
                <div className="p-4 border rounded-lg bg-white shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">Residenza e Domicilio</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="md:col-span-2"><InputGroup label="Via e Numero Civico (Residenza)" name="address.via" value={formData.address?.via} onChange={handleChange} /></div>
                        <div><InputGroup label="CAP" name="address.cap" value={formData.address?.cap} onChange={handleChange} /></div>
                        <div className="md:col-span-3"><InputGroup label="Città" name="address.citta" value={formData.address?.citta} onChange={handleChange} /></div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border mb-4">
                        <input type="checkbox" id="domicilioUgualeResidenza" name="domicilioUgualeResidenza" checked={formData.domicilioUgualeResidenza} onChange={handleChange} className="w-5 h-5 text-indigo-600 rounded" />
                        <label htmlFor="domicilioUgualeResidenza" className="text-sm font-medium text-gray-700 cursor-pointer">Il domicilio coincide con la residenza</label>
                    </div>
                    {!formData.domicilioUgualeResidenza && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-indigo-50/20 border border-indigo-100 rounded animate-fade-in">
                            <div className="md:col-span-2"><InputGroup label="Via e Numero Civico (Domicilio)" name="domicilio.via" value={formData.domicilio?.via} onChange={handleChange} /></div>
                            <div><InputGroup label="CAP (Domicilio)" name="domicilio.cap" value={formData.domicilio?.cap} onChange={handleChange} /></div>
                            <div className="md:col-span-3"><InputGroup label="Città (Domicilio)" name="domicilio.citta" value={formData.domicilio?.citta} onChange={handleChange} /></div>
                        </div>
                    )}
                </div>
                
                {/* --- FIRMA --- */}
                <div className="p-4 border border-indigo-100 bg-indigo-50/50 rounded-lg shadow-sm text-center">
                    <h2 className="text-lg font-bold text-indigo-900 mb-2">Firma Digitale Profilo</h2>
                    <p className="text-xs text-indigo-700 mb-4">Utilizzata automaticamente sui verbali di consegna DPI quando questo utente agirà come consegnatario.</p>
                    {hasSignature ? (
                        <div className="bg-white p-4 border-2 border-green-200 rounded-xl inline-block relative shadow-sm">
                            <CheckCircleIcon className="h-6 w-6 text-green-500 absolute -top-3 -right-3 bg-white rounded-full"/>
                            <img src={formData.firma_base64 || formData.firmaUrl || formData.firma} alt="Firma" className="h-16 object-contain mx-auto" />
                            <button type="button" onClick={() => setFormData(prev => ({...prev, firma_base64: null, firmaUrl: null, firma: null}))} className="text-[10px] text-red-500 mt-2 hover:underline font-bold">Rimuovi firma</button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setIsSignatureModalOpen(true)} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md transition-colors">✒️ Acquisisci Firma</button>
                    )}
                </div>

                {/* --- ALTRI ALLEGATI GENERICI --- */}
                <div className="p-4 border rounded-lg bg-gray-50">
                    <h2 className="text-sm font-semibold mb-2 text-gray-600">Altri Allegati Vari (Non formativi)</h2>
                    <input type="file" multiple onChange={handleFileChange} className="w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-4 file:rounded file:border-0 file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300 bg-white p-2 border border-gray-300 rounded"/>
                </div>

                {/* --- BLOCCO MESSAGGI --- */}
                {message && (
                    <p className={`mt-4 text-sm font-medium p-3 rounded-lg ${isError ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                        {message}
                    </p>
                )}

                <ActionButtons onBack={onBack} isSaving={isLoading} />
            </form>

            {isSignatureModalOpen && <SignatureModal isOpen={isSignatureModalOpen} onClose={() => setIsSignatureModalOpen(false)} onConfirm={handleSaveSignature} />}
        </div>
    );
};

// Helper components
const InputGroup = ({ label, name, type = "text", value, onChange, required = false }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600">{label}</label>
        <input type={type} name={name} value={value || ''} onChange={onChange} className="w-full p-2 border border-gray-300 rounded mt-1 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none" required={required} />
    </div>
);

const FileInput = ({ label, onChange, file, icon }) => (
    <div className="flex items-center justify-between py-1">
        <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">{icon} {label}</span>
        <div className="flex items-center gap-2">
            <input 
                type="file" 
                onChange={onChange} 
                className="w-36 text-[10px] text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
            />
            {file && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200">OK</span>}
        </div>
    </div>
);