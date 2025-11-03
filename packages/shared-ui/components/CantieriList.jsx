import React, { useMemo } from 'react';
import { MapPinIcon } from '@heroicons/react/24/solid';

export const CantieriList = ({ cantieri, onSelectCantiere, userRole, userAziendaId, companies }) => {

    const companyMap = useMemo(() => {
        const safeCompanies = companies || [];
        return safeCompanies.reduce((acc, company) => {
            acc[company.id] = company.name || company.companyName || 'Nome Azienda Mancante';
            return acc;
        }, {});
    }, [companies]);

    const showAziendaColumn = userRole === 'proprietario' && !userAziendaId;

    if (!cantieri) {
        return <div className="text-center p-8">Caricamento lista cantieri...</div>;
    }

    if (cantieri.length === 0) {
        return (
            <div className="text-center p-12 bg-white rounded-lg shadow-md">
                <p className="text-gray-500">Nessun cantiere trovato.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {showAziendaColumn && (
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Azienda
                            </th>
                        )}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nome Cantiere
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Indirizzo
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {cantieri.map((cantiere) => (
                        <tr 
                            key={cantiere.id} 
                            onClick={() => onSelectCantiere(cantiere.id)}
                            className="hover:bg-gray-50 cursor-pointer"
                        >
                            {showAziendaColumn && (
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {companyMap[cantiere.companyID] || 'N/A'}
                                </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {cantiere.nomeCantiere}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {cantiere.nomeCliente}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                                <MapPinIcon className="h-4 w-4 text-gray-400" />
                                {cantiere.indirizzo}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};