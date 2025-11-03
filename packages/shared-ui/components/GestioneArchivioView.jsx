import React, { useState, useMemo } from 'react';
import { ArrowLeftIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
// 🛑 RIMOSSO: import { useTheme } from 'shared-ui';

// Definiamo un colore primario statico (ad esempio, blu/indigo)
const PRIMARY_COLOR_TEXT = 'text-indigo-600';

// Sotto-componente per la timeline
const StoricoTimeline = ({ attrezzo, onBack }) => {
    // 🛑 RIMOSSO: const { primaryColor, colorClasses } = useTheme();
    const eventiOrdinati = attrezzo.eventi.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

    return (
        <div>
            {/* ✅ CLASSE STATICA */}
            <button onClick={onBack} className={`flex items-center gap-2 ${PRIMARY_COLOR_TEXT} mb-6 hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" />
                Torna all'archivio
            </button>
            <h3 className="text-2xl font-bold text-gray-800">Storico per: {attrezzo.attrezzaturaNome}</h3>
            <p className="text-gray-500 mb-6">Seriale: {attrezzo.seriale}</p>

            <div className="relative border-l-2 border-gray-200 pl-6 space-y-8">
                {eventiOrdinati.map((evento, index) => (
                    <div key={index} className="relative">
                        <div className="absolute -left-[35px] top-1 h-4 w-4 rounded-full bg-gray-200"></div>
                        <p className="font-semibold text-md capitalize text-gray-700">{evento.tipo.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-500">{evento.timestamp?.seconds ? new Date(evento.timestamp.seconds * 1000).toLocaleString() : 'N/D'}</p>
                        <p className="text-sm text-gray-600 mt-1">{evento.dettagli}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


export const GestioneArchivioView = ({ archivioAttrezzature }) => {
    const [selectedAttrezzo, setSelectedAttrezzo] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'attrezzaturaNome', direction: 'ascending' });

    const sortedArchivio = useMemo(() => {
        // ... logica di ordinamento ...
        let sortableItems = [...archivioAttrezzature];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [archivioAttrezzature, sortConfig]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    if (selectedAttrezzo) {
        return <StoricoTimeline attrezzo={selectedAttrezzo} onBack={() => setSelectedAttrezzo(null)} />;
    }

    return (
        <div className="animate-fade-in bg-white p-6 rounded-2xl shadow-xl">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Archivio Ciclo Vita Attrezzature</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead className="bg-gray-50">
                        <tr>
                            <th onClick={() => requestSort('attrezzaturaNome')} className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Nome Attrezzo</th>
                            <th onClick={() => requestSort('seriale')} className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Seriale</th>
                            <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {sortedArchivio.length > 0 ? (
                            sortedArchivio.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="py-4 px-4 text-sm font-medium text-gray-900">{item.attrezzaturaNome}</td>
                                    <td className="py-4 px-4 text-sm text-gray-500">{item.seriale}</td>
                                    <td className="py-4 px-4 text-sm">
                                        {/* ✅ CLASSE STATICA */}
                                        <button onClick={() => setSelectedAttrezzo(item)} className={`text-blue-600 hover:text-blue-900 font-medium`}>
                                            Vedi Storico
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="3" className="py-8 px-4 text-center text-gray-500">Nessuno storico disponibile.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

