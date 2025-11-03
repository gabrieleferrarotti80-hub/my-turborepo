import React, { useState } from 'react';
import { useClientsManager, clientSchema } from 'shared-core'; // Import consolidato
import { useFirebaseData } from 'shared-core';
import {ActionButtons} from 'shared-ui';

export const AddClientForm = ({ existingData, companyIdToAdd, onBack }) => {
    // 1. Prendi 'db' dal contesto dell'applicazione
    const { db } = useFirebaseData();
    
    // 2. "Inietta" 'db' nell'hook quando lo chiami
    const { addClient, updateClient, isLoading, message, isError } = useClientsManager(db);
    
    const isEditMode = !!existingData;

    const getInitialFormData = () => {
        const defaults = JSON.parse(JSON.stringify(clientSchema));
        if (isEditMode) {
            return {
                ...defaults,
                ...existingData,
                referente: { ...defaults.referente, ...existingData.referente },
                sedeLegale: { ...defaults.sedeLegale, ...existingData.sedeLegale },
                sedeOperativa: { ...defaults.sedeOperativa, ...existingData.sedeOperativa },
            };
        }
        return defaults;
    };

    const [formData, setFormData] = useState(getInitialFormData());

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'tipoCliente') {
            const newInitialData = JSON.parse(JSON.stringify(clientSchema));
            const newFormData = { 
                ...newInitialData, 
                tipoCliente: value,
                referente: formData.referente,
                sedeLegale: formData.sedeLegale,
                sedeOperativa: formData.sedeOperativa,
            };
            setFormData(newFormData);
            return;
        }

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({ ...prev, [parent]: { ...prev[parent], [child]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = isEditMode
            ? await updateClient(existingData.id, formData)
            : await addClient(formData, companyIdToAdd);
        if (success) onBack();
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-xl animate-fade-in max-h-[85vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">
                {isEditMode ? `Modifica Cliente` : 'Aggiungi Nuovo Cliente'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ... resto del JSX del form (invariato) ... */}
                <fieldset>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo Cliente <span className="text-red-500">*</span></label>
                        <select name="tipoCliente" value={formData.tipoCliente} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl bg-white">
                            <option value="Azienda">Azienda</option>
                            <option value="Ente Pubblico">Ente Pubblico</option>
                            <option value="Privato">Privato</option>
                        </select>
                    </div>
                </fieldset>

                {['Azienda', 'Ente Pubblico'].includes(formData.tipoCliente) && (
                    <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                         <legend className="text-lg font-semibold text-gray-700 col-span-full mb-2">Dati Fiscali</legend>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium">Ragione Sociale <span className="text-red-500">*</span></label>
                            <input type="text" name="ragioneSociale" value={formData.ragioneSociale || ''} onChange={handleChange} required className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/>
                        </div>
                        <div><label className="block text-sm font-medium">Partita IVA</label><input type="text" name="piva" value={formData.piva || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                        <div><label className="block text-sm font-medium">Codice Fiscale</label><input type="text" name="cf" value={formData.cf || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                        <div><label className="block text-sm font-medium">Codice SDI</label><input type="text" name="sdi" value={formData.sdi || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                        <div><label className="block text-sm font-medium">PEC</label><input type="email" name="pec" value={formData.pec || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                    </fieldset>
                )}

                {formData.tipoCliente === 'Privato' && (
                       <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                        <legend className="text-lg font-semibold text-gray-700 col-span-full mb-2">Dati Anagrafici</legend>
                        <div><label className="block text-sm font-medium">Nome <span className="text-red-500">*</span></label><input type="text" name="nome" value={formData.nome || ''} onChange={handleChange} required className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                        <div><label className="block text-sm font-medium">Cognome <span className="text-red-500">*</span></label><input type="text" name="cognome" value={formData.cognome || ''} onChange={handleChange} required className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                        <div><label className="block text-sm font-medium">Codice Fiscale</label><input type="text" name="cf" value={formData.cf || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                    </fieldset>
                )}
                
                <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <legend className="text-lg font-semibold text-gray-700 col-span-full mb-2">Referente</legend>
                    <div><label className="block text-sm font-medium">Nome</label><input type="text" name="referente.nome" value={formData.referente?.nome || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                    <div><label className="block text-sm font-medium">Cognome</label><input type="text" name="referente.cognome" value={formData.referente?.cognome || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                    <div><label className="block text-sm font-medium">Email</label><input type="email" name="referente.email" value={formData.referente?.email || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                    <div><label className="block text-sm font-medium">Telefono</label><input type="tel" name="referente.telefono" value={formData.referente?.telefono || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                </fieldset>

                <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <legend className="text-lg font-semibold text-gray-700 col-span-full mb-2">Sede Legale / Residenza</legend>
                    <div className="md:col-span-2"><label className="block text-sm font-medium">Via / Piazza</label><input type="text" name="sedeLegale.via" value={formData.sedeLegale?.via || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                    <div><label className="block text-sm font-medium">Città</label><input type="text" name="sedeLegale.citta" value={formData.sedeLegale?.citta || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                    <div><label className="block text-sm font-medium">CAP</label><input type="text" name="sedeLegale.cap" value={formData.sedeLegale?.cap || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                </fieldset>

                <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <legend className="text-lg font-semibold text-gray-700 col-span-full mb-2">Sede Operativa / Domicilio (se diversa)</legend>
                    <div className="md:col-span-2"><label className="block text-sm font-medium">Via / Piazza</label><input type="text" name="sedeOperativa.via" value={formData.sedeOperativa?.via || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                    <div><label className="block text-sm font-medium">Città</label><input type="text" name="sedeOperativa.citta" value={formData.sedeOperativa?.citta || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                    <div><label className="block text-sm font-medium">CAP</label><input type="text" name="sedeOperativa.cap" value={formData.sedeOperativa?.cap || ''} onChange={handleChange} className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl"/></div>
                </fieldset>

                <ActionButtons onBack={onBack} isSaving={isLoading} saveLabel={isEditMode ? 'Salva Modifiche' : 'Aggiungi Cliente'} />
            </form>
            {message && <p className={`mt-4 text-center p-2 rounded-md ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</p>}
        </div>
    );
};

// Ho anche modificato l'export per coerenza
// export default AddClientForm;