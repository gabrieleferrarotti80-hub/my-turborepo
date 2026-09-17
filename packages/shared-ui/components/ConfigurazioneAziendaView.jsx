import React, { useState, useEffect } from 'react';
import { BuildingOffice2Icon, PhotoIcon, CreditCardIcon } from '@heroicons/react/24/solid';

export const ConfigurazioneAziendaView = ({ 
    aziendaData, 
    onSave, 
    isSaving 
}) => {
    
    const [formData, setFormData] = useState({
        ragioneSociale: '', piva: '', codiceFiscale: '',
        indirizzo: '', citta: '', cap: '',
        email: '', telefono: '', sitoWeb: '',
        iban: '', banca: '',
        logoUrl: null
    });
    const [logoFile, setLogoFile] = useState(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (aziendaData) {
            setFormData(prev => ({ ...prev, ...aziendaData }));
            if (aziendaData.logoUrl) setPreview(aziendaData.logoUrl);
        }
    }, [aziendaData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData, logoFile);
    };

    const inputClass = "w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
            
            <div className="border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <BuildingOffice2Icon className="h-8 w-8 text-indigo-600"/> Impostazioni Azienda
                </h1>
                <p className="text-gray-500">Gestisci i dati fiscali, il logo e le coordinate bancarie.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* 1. Logo & Intestazione */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <PhotoIcon className="h-5 w-5 text-indigo-500"/> Logo Aziendale
                    </h2>
                    <div className="flex items-center gap-6">
                        <div className="h-32 w-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50 relative">
                            {preview ? (
                                <img src={preview} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <span className="text-gray-400 text-xs text-center">Nessun Logo</span>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Carica Logo (PNG, JPG)</label>
                            <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                            <p className="text-xs text-gray-500 mt-2">Apparirà su preventivi e fatture.</p>
                        </div>
                    </div>
                </div>

                {/* 2. Dati Anagrafici */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Dati Fiscali</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Ragione Sociale *</label>
                            <input type="text" name="ragioneSociale" value={formData.ragioneSociale} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>Partita IVA *</label>
                            <input type="text" name="piva" value={formData.piva} onChange={handleChange} className={inputClass} required />
                        </div>
                        <div>
                            <label className={labelClass}>Codice Fiscale</label>
                            <input type="text" name="codiceFiscale" value={formData.codiceFiscale} onChange={handleChange} className={inputClass} />
                        </div>
                    </div>
                </div>

                {/* 3. Contatti e Sede */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Sede e Contatti</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Indirizzo</label>
                            <input type="text" name="indirizzo" value={formData.indirizzo} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Città</label>
                            <input type="text" name="citta" value={formData.citta} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>CAP</label>
                            <input type="text" name="cap" value={formData.cap} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Email (Amministrazione)</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Telefono</label>
                            <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className={inputClass} />
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClass}>Sito Web</label>
                            <input type="text" name="sitoWeb" value={formData.sitoWeb} onChange={handleChange} className={inputClass} placeholder="https://" />
                        </div>
                    </div>
                </div>

                {/* 4. Banca */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CreditCardIcon className="h-5 w-5 text-indigo-500"/> Coordinate Bancarie
                    </h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className={labelClass}>Banca / Filiale</label>
                            <input type="text" name="banca" value={formData.banca} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>IBAN</label>
                            <input type="text" name="iban" value={formData.iban} onChange={handleChange} className={inputClass} placeholder="IT..." />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={isSaving} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors">
                        {isSaving ? 'Salvataggio...' : 'Salva Impostazioni'}
                    </button>
                </div>

            </form>
        </div>
    );
};