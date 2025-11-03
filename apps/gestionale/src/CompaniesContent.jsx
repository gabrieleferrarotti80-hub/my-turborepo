import React, { useState } from 'react';
import {ActionButtons} from 'shared-ui';
import { useFirebaseData } from 'shared-core';
import { useCompaniesManager } from 'shared-core';
import { companySchema, userSchema } from 'shared-core';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

// Componente per il modulo di modifica dell'azienda
const EditCompanyForm = ({ company, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ ...company });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="p-8 space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800">Modifica Azienda</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Campi dell'azienda */}
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Nome Azienda</label>
                        <input type="text" id="companyName" name="companyName" value={formData.companyName || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="companyPiva" className="block text-sm font-medium text-gray-700">Partita IVA</label>
                        <input type="text" id="companyPiva" name="companyPiva" value={formData.companyPiva || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="companyCf" className="block text-sm font-medium text-gray-700">Codice Fiscale</label>
                        <input type="text" id="companyCf" name="companyCf" value={formData.companyCf || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">Numero di Telefono</label>
                        <input type="tel" id="companyPhone" name="companyPhone" value={formData.companyPhone || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyPec" className="block text-sm font-medium text-gray-700">PEC</label>
                        <input type="email" id="companyPec" name="companyPec" value={formData.companyPec || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companySdi" className="block text-sm font-medium text-gray-700">Codice SDI</label>
                        <input type="text" id="companySdi" name="companySdi" value={formData.companySdi || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">Indirizzo</label>
                        <input type="text" id="companyAddress" name="companyAddress" value={formData.companyAddress || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyCity" className="block text-sm font-medium text-gray-700">Città</label>
                        <input type="text" id="companyCity" name="companyCity" value={formData.companyCity || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyProvince" className="block text-sm font-medium text-gray-700">Provincia</label>
                        <input type="text" id="companyProvince" name="companyProvince" value={formData.companyProvince || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyZip" className="block text-sm font-medium text-gray-700">CAP</label>
                        <input type="text" id="companyZip" name="companyZip" value={formData.companyZip || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                        Annulla
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
                        Salva Modifiche
                    </button>
                </div>
            </form>
        </div>
    );
};


export const CompaniesContent = ({ onNavigate }) => {
    const { companies, db, auth, loadingAuth, loadingData } = useFirebaseData();
    const { addCompanyWithUser, isLoading, message, isError, updateCompany } = useCompaniesManager(db, auth);

    const [editingCompany, setEditingCompany] = useState(null);

    const getInitialFormData = () => {
        const allFields = { ...companySchema, ...userSchema };
        return Object.fromEntries(Object.keys(allFields).map(key => [key, '']));
    };
    const [formData, setFormData] = useState(getInitialFormData());

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        const companyData = Object.keys(companySchema).reduce((acc, key) => {
            if (formData[key] !== undefined) acc[key] = formData[key];
            return acc;
        }, {});
        
        const userData = Object.keys(userSchema).reduce((acc, key) => {
            if (formData[key] !== undefined) acc[key] = formData[key];
            return acc;
        }, {});
        
        const success = await addCompanyWithUser(companyData, userData);
        
        if (success) {
            setFormData(getInitialFormData());
        }
    };
    
    const handleEditClick = (company) => {
        setEditingCompany(company);
    };

    const handleSaveEdit = async (updatedData) => {
        await updateCompany(updatedData.id, updatedData);
        setEditingCompany(null);
    };

    const handleCancelEdit = () => {
        setEditingCompany(null);
    };

    // ✅ CORREZIONE: Aggiunto "!companies" per rendere il controllo più robusto.
    // Questo previene il crash se il caricamento finisce ma l'array non è ancora pronto.
    if (loadingAuth || loadingData || !companies) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
            </div>
        );
    }
    
    if (editingCompany) {
        return <EditCompanyForm company={editingCompany} onSave={handleSaveEdit} onCancel={handleCancelEdit} />;
    }

    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto">
            {onNavigate && (
                <button 
                    onClick={() => onNavigate('dashboard')} 
                    className="flex items-center gap-2 text-indigo-600 hover:underline mb-4"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Torna alla Dashboard
                </button>
            )}

            <h1 className="text-3xl font-bold text-gray-800">Registra Nuova Azienda</h1>

            <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Campi per l'azienda */}
                    <div>
                        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Nome Azienda</label>
                        <input type="text" id="companyName" name="companyName" value={formData.companyName || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="companyPiva" className="block text-sm font-medium text-gray-700">Partita IVA</label>
                        <input type="text" id="companyPiva" name="companyPiva" value={formData.companyPiva || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="companyCf" className="block text-sm font-medium text-gray-700">Codice Fiscale</label>
                        <input type="text" id="companyCf" name="companyCf" value={formData.companyCf || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">Numero di Telefono</label>
                        <input type="tel" id="companyPhone" name="companyPhone" value={formData.companyPhone || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyPec" className="block text-sm font-medium text-gray-700">PEC</label>
                        <input type="email" id="companyPec" name="companyPec" value={formData.companyPec || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companySdi" className="block text-sm font-medium text-gray-700">Codice SDI</label>
                        <input type="text" id="companySdi" name="companySdi" value={formData.companySdi || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">Indirizzo</label>
                        <input type="text" id="companyAddress" name="companyAddress" value={formData.companyAddress || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyCity" className="block text-sm font-medium text-gray-700">Città</label>
                        <input type="text" id="companyCity" name="companyCity" value={formData.companyCity || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyProvince" className="block text-sm font-medium text-gray-700">Provincia</label>
                        <input type="text" id="companyProvince" name="companyProvince" value={formData.companyProvince || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="companyZip" className="block text-sm font-medium text-gray-700">CAP</label>
                        <input type="text" id="companyZip" name="companyZip" value={formData.companyZip || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>

                    {/* Campi per l'utente proprietario */}
                    <div className="md:col-span-2 border-t pt-4">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Dati Titolare</h2>
                    </div>
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome Titolare</label>
                        <input type="text" id="nome" name="nome" value={formData.nome || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="cognome" className="block text-sm font-medium text-gray-700">Cognome Titolare</label>
                        <input type="text" id="cognome" name="cognome" value={formData.cognome || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Titolare</label>
                        <input type="email" id="email" name="email" value={formData.email || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" id="password" name="password" value={formData.password || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
                    </div>
                </div>

                <div className="pt-4">
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700" disabled={isLoading}>
                        {isLoading ? 'Registrazione...' : 'Registra Azienda'}
                    </button>
                </div>
            </form>

            {message && (
                <div className={`mt-4 p-4 rounded-md ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {message}
                </div>
            )}

            <div className="pt-8">
                <h2 className="text-2xl font-semibold text-gray-800">Aziende Registrate</h2>
                <ul className="mt-4 space-y-2">
                    {companies.map(company => (
                        <li key={company.id} className="p-4 bg-gray-50 rounded-lg shadow-sm flex items-center justify-between">
                            <div>
                                <p className="font-medium">{company.companyName}</p>
                                <p className="text-sm text-gray-500">{company.companyPiva}</p>
                            </div>
                            <button
                                onClick={() => handleEditClick(company)}
                                className="px-3 py-1 text-sm text-indigo-600 bg-white border border-gray-300 rounded-md hover:bg-gray-100"
                            >
                                Modifica
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};