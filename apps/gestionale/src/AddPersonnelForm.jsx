// apps/gestionale/src/AddPersonnelForm.jsx

import React, { useState } from 'react';
import { usePersonnelManager, userSchema } from 'shared-core';
import { useFirebaseData } from 'shared-core';
import { ActionButtons } from 'shared-ui';

export const AddPersonnelForm = ({ existingData, companyIdToAdd, onBack }) => {
    // La logica di gestione dello stato e delle funzioni rimane invariata
    const { auth, db, storage } = useFirebaseData();
    const { addPersonnel, updatePersonnel, isLoading, message, isError } = usePersonnelManager(auth, db, storage);
    const isEditMode = !!existingData;

    const getInitialFormData = () => {
        const defaults = { ...userSchema };
        if (isEditMode) {
            return { ...defaults, ...existingData };
        }
        defaults.password = '';
        return defaults;
    };

    const [formData, setFormData] = useState(getInitialFormData());
    const [filesToUpload, setFilesToUpload] = useState([]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFileChange = (e) => {
        setFilesToUpload(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let success;
        if (isEditMode) {
            success = await updatePersonnel(existingData.id, formData);
        } else {
            success = await addPersonnel(formData, companyIdToAdd, filesToUpload);
        }
        if (success) {
            onBack();
        }
    };
    
    // --- ✅ BLOCCO JSX RICOSTRUITO E COMPLETO ---
    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">{isEditMode ? 'Modifica Personale' : 'Aggiungi Nuovo Personale'}</h1>
            
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Sezione Anagrafica */}
                <div className="p-4 border rounded-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Anagrafica</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Nome</label>
                            <input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Cognome</label>
                            <input type="text" name="cognome" value={formData.cognome || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Email</label>
                            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1" required />
                        </div>
                        {!isEditMode && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Password</label>
                                <input type="password" name="password" value={formData.password || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1" required />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-600">Ruolo</label>
                            <select name="ruolo" value={formData.ruolo || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1" required>
                                <option value="">Seleziona un ruolo...</option>
                                <option value="titolare-azienda">Titolare Azienda</option>
                                <option value="preposto">Preposto</option>
                                <option value="tecnico">Tecnico</option>
                                <option value="amministrazione">Amministrazione</option>
                                <option value="dipendente">Dipendente</option> {/* 👈 NUOVA OPZIONE */}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Sezione Indirizzo */}
                <div className="p-4 border rounded-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-700">Indirizzo di Residenza</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-600">Via e Numero Civico</label>
                            <input type="text" name="address.via" value={formData.address?.via || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600">CAP</label>
                            <input type="text" name="address.cap" value={formData.address?.cap || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                        </div>
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-600">Città</label>
                            <input type="text" name="address.citta" value={formData.address?.citta || ''} onChange={handleChange} className="w-full p-2 border rounded mt-1" />
                        </div>
                    </div>
                </div>
                
                {/* Altri Dettagli (Esempio) */}
                {/* Puoi espandere questa sezione con altri campi dallo schema se necessario */}

                {message && (
                    <p className={`mt-4 text-sm ${isError ? 'text-red-600' : 'text-green-600'}`}>
                        {message}
                    </p>
                )}

                <ActionButtons onBack={onBack} isSaving={isLoading} />
            </form>
        </div>
    );
};