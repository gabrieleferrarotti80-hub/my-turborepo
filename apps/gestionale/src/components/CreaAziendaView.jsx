// Percorso: apps/gestionale/src/components/CreaAziendaView.jsx

import React, { useState, useEffect } from 'react';
import { useCompaniesManager } from 'shared-core';

const initialFormData = {
    companyName: '',
    billing: { vatNumber: '', sdiCode: '', pec: '' },
    legalAddress: { street: '', city: '', state: '', zip: '', country: 'Italia' },
    warehouseAddress: { street: '', city: '', state: '', zip: '', country: 'Italia' },
    contact: { name: '', email: '', phone: '', adminEmail: '', adminPhone: '' },
    owner: { firstName: '', lastName: '', email: '', password: '', phone: '' }
};

export const CreaAziendaView = () => {
    const { addCompanyWithUser, isLoading, message, isError } = useCompaniesManager();
    const [formData, setFormData] = useState(initialFormData);
    const [isSameAddress, setIsSameAddress] = useState(false);

    useEffect(() => {
        if (isSameAddress) {
            setFormData(prev => ({ ...prev, warehouseAddress: { ...prev.legalAddress } }));
        }
    }, [isSameAddress, formData.legalAddress]);

    const handleChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleSimpleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        // ✅ CORREZIONE: Non rinominiamo più il campo.
        // Il backend riceverà e salverà 'companyName' direttamente.
        const companyData = {
            companyName: formData.companyName,
            billing: formData.billing,
            legalAddress: formData.legalAddress,
            warehouseAddress: formData.warehouseAddress,
            contact: formData.contact
        };
        const userData = {
            nome: formData.owner.firstName,
            cognome: formData.owner.lastName,
            email: formData.owner.email,
            password: formData.owner.password,
            telefono: formData.owner.phone
        };

        const success = await addCompanyWithUser(companyData, userData);
        if (success) {
            setFormData(initialFormData);
            setIsSameAddress(false);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Crea Nuova Azienda e Titolare</h1>
            
            <form onSubmit={handleSubmit} className="space-y-8 p-8 bg-white rounded-2xl shadow-xl max-w-4xl mx-auto">
                
                {/* --- SEZIONE DATI AZIENDALI --- */}
                <fieldset>
                    <legend className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Dati Aziendali</legend>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Nome Azienda</label>
                    <input type="text" id="companyName" name="companyName" value={formData.companyName} onChange={handleSimpleChange} className="mt-1 p-2 border rounded-md w-full" required />
                </fieldset>

                {/* --- SEZIONE DATI FATTURAZIONE (OPZIONALE) --- */}
                <fieldset>
                    <legend className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Dati di Fatturazione</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <div>
                            <label htmlFor="vatNumber" className="block text-sm font-medium text-gray-700">Partita IVA</label>
                            <input type="text" id="vatNumber" value={formData.billing.vatNumber} onChange={(e) => handleChange('billing', 'vatNumber', e.target.value)} className="mt-1 p-2 border rounded-md w-full" />
                        </div>
                        <div>
                            <label htmlFor="sdiCode" className="block text-sm font-medium text-gray-700">Codice SDI</label>
                            <input type="text" id="sdiCode" value={formData.billing.sdiCode} onChange={(e) => handleChange('billing', 'sdiCode', e.target.value)} className="mt-1 p-2 border rounded-md w-full" />
                        </div>
                        <div>
                            <label htmlFor="pec" className="block text-sm font-medium text-gray-700">Indirizzo PEC</label>
                            <input type="email" id="pec" value={formData.billing.pec} onChange={(e) => handleChange('billing', 'pec', e.target.value)} className="mt-1 p-2 border rounded-md w-full" />
                        </div>
                    </div>
                </fieldset>

                {/* --- SEZIONE INDIRIZZI (OPZIONALE) --- */}
                <fieldset>
                    <legend className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Indirizzi</legend>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                        {/* Sede Legale */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-700">Sede Legale</h3>
                            <input placeholder="Indirizzo" type="text" value={formData.legalAddress.street} onChange={(e) => handleChange('legalAddress', 'street', e.target.value)} className="p-2 border rounded-md w-full" />
                            <div className="grid grid-cols-3 gap-4">
                                <input placeholder="Città" type="text" value={formData.legalAddress.city} onChange={(e) => handleChange('legalAddress', 'city', e.target.value)} className="col-span-2 p-2 border rounded-md w-full" />
                                <input placeholder="CAP" type="text" value={formData.legalAddress.zip} onChange={(e) => handleChange('legalAddress', 'zip', e.target.value)} className="p-2 border rounded-md w-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Provincia" type="text" value={formData.legalAddress.state} onChange={(e) => handleChange('legalAddress', 'state', e.target.value)} className="p-2 border rounded-md w-full" />
                                <input placeholder="Nazione" type="text" value={formData.legalAddress.country} onChange={(e) => handleChange('legalAddress', 'country', e.target.value)} className="p-2 border rounded-md w-full" />
                            </div>
                        </div>
                        {/* Sede Magazzino */}
                        <div className={`space-y-4 ${isSameAddress ? 'opacity-50' : ''}`}>
                            <h3 className="text-lg font-semibold text-gray-700">Sede Magazzino</h3>
                            <input placeholder="Indirizzo" type="text" disabled={isSameAddress} value={formData.warehouseAddress.street} onChange={(e) => handleChange('warehouseAddress', 'street', e.target.value)} className="p-2 border rounded-md w-full" />
                            <div className="grid grid-cols-3 gap-4">
                                <input placeholder="Città" type="text" disabled={isSameAddress} value={formData.warehouseAddress.city} onChange={(e) => handleChange('warehouseAddress', 'city', e.target.value)} className="col-span-2 p-2 border rounded-md w-full" />
                                <input placeholder="CAP" type="text" disabled={isSameAddress} value={formData.warehouseAddress.zip} onChange={(e) => handleChange('warehouseAddress', 'zip', e.target.value)} className="p-2 border rounded-md w-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Provincia" type="text" disabled={isSameAddress} value={formData.warehouseAddress.state} onChange={(e) => handleChange('warehouseAddress', 'state', e.target.value)} className="p-2 border rounded-md w-full" />
                                <input placeholder="Nazione" type="text" disabled={isSameAddress} value={formData.warehouseAddress.country} onChange={(e) => handleChange('warehouseAddress', 'country', e.target.value)} className="p-2 border rounded-md w-full" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center">
                        <input id="same-address" type="checkbox" checked={isSameAddress} onChange={(e) => setIsSameAddress(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"/>
                        <label htmlFor="same-address" className="ml-2 block text-sm text-gray-900">Il magazzino coincide con la sede legale</label>
                    </div>
                </fieldset>

                {/* --- SEZIONE CONTATTI AZIENDALI (OPZIONALE) --- */}
                <fieldset>
                    <legend className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Contatti Aziendali</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Referente Principale</label>
                            <input type="text" placeholder="Nome Referente" value={formData.contact.name} onChange={(e) => handleChange('contact', 'name', e.target.value)} className="p-2 border rounded-md w-full" />
                            <input type="email" placeholder="Email Referente" value={formData.contact.email} onChange={(e) => handleChange('contact', 'email', e.target.value)} className="mt-2 p-2 border rounded-md w-full" />
                            <input type="tel" placeholder="Telefono Referente" value={formData.contact.phone} onChange={(e) => handleChange('contact', 'phone', e.target.value)} className="mt-2 p-2 border rounded-md w-full" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amministrazione</label>
                            <input type="email" placeholder="Email Amministrazione" value={formData.contact.adminEmail} onChange={(e) => handleChange('contact', 'adminEmail', e.target.value)} className="p-2 border rounded-md w-full" />
                            <input type="tel" placeholder="Telefono Amministrazione" value={formData.contact.adminPhone} onChange={(e) => handleChange('contact', 'adminPhone', e.target.value)} className="mt-2 p-2 border rounded-md w-full" />
                        </div>
                    </div>
                </fieldset>
                
                {/* --- SEZIONE DATI TITOLARE (OBBLIGATORI) --- */}
                <fieldset className="space-y-4">
                    <legend className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">Dati Titolare</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-600">Nome</label>
                            <input id="firstName" value={formData.owner.firstName} onChange={(e) => handleChange('owner', 'firstName', e.target.value)} placeholder="Mario" className="mt-1 p-2 border rounded-md w-full" required />
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-600">Cognome</label>
                            <input id="lastName" value={formData.owner.lastName} onChange={(e) => handleChange('owner', 'lastName', e.target.value)} placeholder="Rossi" className="mt-1 p-2 border rounded-md w-full" required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-600">Email</label>
                        <input id="email" type="email" value={formData.owner.email} onChange={(e) => handleChange('owner', 'email', e.target.value)} placeholder="mario.rossi@email.com" className="mt-1 p-2 border rounded-md w-full" required />
                    </div>
                    <div>
                        <label htmlFor="ownerPhone" className="block text-sm font-medium text-gray-600">Telefono Titolare</label>
                        <input id="ownerPhone" type="tel" value={formData.owner.phone} onChange={(e) => handleChange('owner', 'phone', e.target.value)} placeholder="3331234567" className="mt-1 p-2 border rounded-md w-full" />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-600">Password</label>
                        <input id="password" type="password" value={formData.owner.password} onChange={(e) => handleChange('owner', 'password', e.target.value)} placeholder="••••••••" className="mt-1 p-2 border rounded-md w-full" required minLength="6" />
                    </div>
                </fieldset>
                
                <div className="pt-4">
                    <button type="submit" disabled={isLoading} className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed">
                        {isLoading ? 'Creazione in corso...' : 'Crea Azienda'}
                    </button>
                </div>
                
                {message && (
                    <p className={`text-sm text-center mt-4 ${isError ? 'text-red-600' : 'text-green-600'}`}>
                        {message}
                    </p>
                )}
            </form>
        </div>
    );
};