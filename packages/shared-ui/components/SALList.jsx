import React, { useState, useMemo } from 'react';
import { 
    PencilSquareIcon, 
    TrashIcon, 
    ChevronUpIcon, 
    ChevronDownIcon, 
    ChevronUpDownIcon 
} from '@heroicons/react/24/solid';

const formatCurrency = (val) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val);

const formatDate = (d) => {
    if (!d) return '-';
    const date = d.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString('it-IT');
};

export const SALList = ({ salList = [], onEdit, onDelete }) => {
    
    // STATO PER L'ORDINAMENTO
    const [sortConfig, setSortConfig] = useState({ key: 'data', direction: 'desc' });

    // LOGICA DI ORDINAMENTO INTERATTIVO MIGLIORATA
    const sortedSalList = useMemo(() => {
        let sortableItems = [...salList];
        
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'data') {
                    aValue = new Date(a.data || 0).getTime();
                    bValue = new Date(b.data || 0).getTime();
                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                } 
                else if (sortConfig.key === 'importo' || sortConfig.key === 'percentuale') {
                    aValue = parseFloat(aValue || 0);
                    bValue = parseFloat(bValue || 0);
                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                } 
                else {
                    aValue = (aValue || '').toString().toLowerCase().replace(/\s+/g, '');
                    bValue = (bValue || '').toString().toLowerCase().replace(/\s+/g, '');
                    const cmp = aValue.localeCompare(bValue, undefined, { numeric: true });
                    return sortConfig.direction === 'asc' ? cmp : -cmp;
                }
            });
        }
        return sortableItems;
    }, [salList, sortConfig]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortableHeader = (label, key, align = 'left') => {
        const isActive = sortConfig.key === key;
        
        return (
            <th 
                className={`px-6 py-3 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-200 transition-colors select-none group`}
                onClick={() => requestSort(key)}
            >
                <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    {label}
                    {isActive ? (
                        sortConfig.direction === 'asc' ? 
                            <ChevronUpIcon className="h-4 w-4 text-indigo-600" /> : 
                            <ChevronDownIcon className="h-4 w-4 text-indigo-600" />
                    ) : (
                        <ChevronUpDownIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                </div>
            </th>
        );
    };

    return (
        <div className="animate-fade-in">
            {/* Tabella con Intestazioni Cliccabili - Senza box doppioni sopra */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            {renderSortableHeader('Data', 'data', 'left')}
                            {renderSortableHeader('Descrizione / Titolo', 'titolo', 'left')}
                            {renderSortableHeader('Importo', 'importo', 'right')}
                            {renderSortableHeader('Avanzamento', 'percentuale', 'right')}
                            {renderSortableHeader('Stato', 'stato', 'center')}
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase cursor-default">
                                Azioni
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedSalList.length === 0 ? (
                            <tr><td colSpan="6" className="p-10 text-center text-gray-500 font-medium">Nessun SAL emesso per questo cantiere. Clicca su "Emetti Nuovo SAL" in alto per iniziare.</td></tr>
                        ) : (
                            sortedSalList.map(sal => (
                                <tr key={sal.id} className="hover:bg-indigo-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">{formatDate(sal.data)}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{sal.titolo}</td>
                                    <td className="px-6 py-4 text-right font-black text-gray-800">{formatCurrency(sal.importo)}</td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-600 font-mono font-bold">{sal.percentuale}%</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                            sal.stato === 'fatturato' ? 'bg-green-100 text-green-800 border-green-200 shadow-sm' :
                                            sal.stato === 'approvato' ? 'bg-blue-100 text-blue-800 border-blue-200 shadow-sm' :
                                            'bg-gray-100 text-gray-600 border-gray-200'
                                        }`}>
                                            {sal.stato}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => onEdit(sal)} className="text-indigo-600 hover:bg-indigo-100 hover:text-indigo-800 p-1.5 rounded transition-colors" title="Modifica">
                                                <PencilSquareIcon className="h-5 w-5"/>
                                            </button>
                                            <button onClick={() => onDelete(sal.id)} className="text-red-500 hover:bg-red-100 hover:text-red-700 p-1.5 rounded transition-colors" title="Elimina">
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};