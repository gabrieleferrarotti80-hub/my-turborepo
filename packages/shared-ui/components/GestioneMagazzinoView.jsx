// Percorso: packages/shared-ui/components/GestioneMagazzinoView.jsx

import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilSquareIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useTheme } from 'shared-ui';

export const GestioneMagazzinoView = ({ articoli, setLocalView, handleDelete, userRole }) => {
    const { primaryColor, colorClasses } = useTheme();
    const [sortConfig, setSortConfig] = useState({ key: 'nome', direction: 'ascending' });

    const sortedArticoli = useMemo(() => {
        if (!articoli) return [];
        let sortableItems = [...articoli];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const getValue = (obj, key) => {
                    if (['marca', 'modello'].includes(key)) return obj.dettagli?.[key] || '';
                    if (key === 'companyName') return obj.companyName || '';
                    return obj[key] || '';
                };
                const valA = getValue(a, sortConfig.key);
                const valB = getValue(b, sortConfig.key);
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [articoli, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (name) => {
        if (sortConfig.key !== name) return <span className="w-4 ml-1"></span>;
        return sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4 ml-1 inline text-gray-600" /> : <ChevronDownIcon className="h-4 w-4 ml-1 inline text-gray-600" />;
    };

    return (
        <div className="animate-fade-in bg-white p-6 rounded-2xl shadow-xl w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Inventario Attrezzature</h2>
                <button
                    onClick={() => setLocalView('aggiungi-articolo')}
                    className={`flex items-center gap-2 py-2 px-4 text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 ${colorClasses[primaryColor].bg}`}
                >
                    <PlusIcon className="h-5 w-5" />
                    Aggiungi Articolo
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            {/* ✅ 1. COLONNA AZIENDA SPOSTATA QUI */}
                            {userRole === 'proprietario' && (
                                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('companyName')} className="flex items-center focus:outline-none hover:text-gray-700">Azienda {getSortIcon('companyName')}</button></th>
                            )}

                            {/* Altre intestazioni */}
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('nome')} className="flex items-center focus:outline-none hover:text-gray-700">Nome {getSortIcon('nome')}</button></th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('seriale')} className="flex items-center focus:outline-none hover:text-gray-700">Seriale {getSortIcon('seriale')}</button></th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('marca')} className="flex items-center focus:outline-none hover:text-gray-700">Marca {getSortIcon('marca')}</button></th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('modello')} className="flex items-center focus:outline-none hover:text-gray-700">Modello {getSortIcon('modello')}</button></th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('categoria')} className="flex items-center focus:outline-none hover:text-gray-700">Categoria {getSortIcon('categoria')}</button></th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"><button onClick={() => requestSort('stato')} className="flex items-center focus:outline-none hover:text-gray-700">Stato {getSortIcon('stato')}</button></th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedArticoli.length > 0 ? (
                            sortedArticoli.map(articolo => (
                                <tr key={articolo.id} className="hover:bg-gray-50">
                                    {/* ✅ 2. CELLA AZIENDA SPOSTATA QUI */}
                                    {userRole === 'proprietario' && (
                                        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">{articolo.companyName}</td>
                                    )}

                                    {/* Altre celle */}
                                    <td className="py-4 px-4 whitespace-nowrap text-sm font-medium text-gray-900">{articolo.nome}</td>
                                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">{articolo.seriale}</td>
                                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">{articolo.dettagli?.marca || '-'}</td>
                                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">{articolo.dettagli?.modello || '-'}</td>
                                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">{articolo.categoria}</td>
                                    <td className="py-4 px-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${articolo.stato === 'disponibile' ? 'bg-green-100 text-green-800' : articolo.stato === 'in uso' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                            {articolo.stato}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <button onClick={() => setLocalView('modifica-articolo', articolo)} className="text-blue-600 hover:text-blue-900"><PencilSquareIcon className="h-5 w-5" /></button>
                                        <button onClick={() => handleDelete(articolo)} className="text-red-600 hover:text-red-900"><TrashIcon className="h-5 w-5" /></button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                {/* Il colSpan non ha bisogno di modifiche, la logica è ancora corretta */}
                                <td colSpan={userRole === 'proprietario' ? 9 : 8} className="py-8 px-4 text-center text-gray-500">
                                    Nessun articolo trovato in magazzino.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};