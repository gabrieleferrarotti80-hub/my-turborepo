// apps/gestionale/src/AziendaSelector.jsx

import React from 'react';
import { useFirebaseData } from 'shared-core';

export const AziendaSelector = () => {
   const { userRole, data, userAziendaId, handleCompanyChange } = useFirebaseData();
    const companies = data?.companies || [];
    if (userRole !== 'proprietario') {
        return null;
    }

    return (
        <div className="p-4 bg-gray-800 text-white border-b border-gray-700">
            <label className="block text-gray-400 text-sm font-bold mb-2">
                Seleziona Azienda
            </label>
            <select
                value={userAziendaId || 'all'}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className="block w-full rounded-md border-transparent bg-gray-700 text-white shadow-sm focus:ring focus:ring-opacity-50 p-2"
            >
                <option value="all">Tutte le aziende</option>
                {companies.length > 0 ? (
                    companies.map(company => (
                        <option key={company.id} value={company.id}>
                            {company.companyName || 'Azienda senza nome'}
                        </option>
                    ))
                ) : (
                    <option value="" disabled>Nessuna azienda trovata</option>
                )}
            </select>
        </div>
    );
};