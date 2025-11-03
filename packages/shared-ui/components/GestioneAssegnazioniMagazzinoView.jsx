import React, { useState, useMemo } from 'react'; 
import { ArrowUpIcon, ArrowDownIcon, EyeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'; 

export const GestioneAssegnazioniMagazzinoView = ({ assegnazioni, setLocalView, onBack }) => { 
     const [sortConfig, setSortConfig] = useState({ key: 'dataAssegnazione', direction: 'descending' }); 

     const sortedAssegnazioni = useMemo(() => { 
         let sortableItems = [...assegnazioni]; 
         if (sortConfig !== null) { 
             sortableItems.sort((a, b) => { 
                 const valA = a[sortConfig.key]; 
                 const valB = b[sortConfig.key]; 

                 if (valA?.seconds && valB?.seconds) { 
                     if (valA.seconds < valB.seconds) return sortConfig.direction === 'ascending' ? -1 : 1; 
                     if (valA.seconds > valB.seconds) return sortConfig.direction === 'ascending' ? 1 : -1; 
                     return 0; 
                 } 
                  
                 if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1; 
                 if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1; 
                 return 0; 
             }); 
         } 
         return sortableItems; 
     }, [assegnazioni, sortConfig]); 

     const requestSort = (key) => { 
         let direction = 'ascending'; 
         if (sortConfig.key === key && sortConfig.direction === 'ascending') { 
             direction = 'descending'; 
         } 
         setSortConfig({ key, direction }); 
     }; 
      
    // ✅ CORREZIONE: DEFINIZIONE DI getSortIcon ALL'INTERNO
    const getSortIcon = (name) => {
        if (sortConfig.key !== name) {
            return null;
        }
        if (sortConfig.direction === 'ascending') {
            return <ArrowUpIcon className="h-4 w-4 ml-1 inline text-gray-600" />;
        }
        return <ArrowDownIcon className="h-4 w-4 ml-1 inline text-gray-600" />;
    };

    // ✅ CORREZIONE: DEFINIZIONE DI SortableHeader ALL'INTERNO
     const SortableHeader = ({ label, sortKey }) => ( 
         <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(sortKey)}> 
             <span className="flex items-center"> 
                 {label} 
                 {getSortIcon(sortKey)} 
             </span> 
         </th> 
     ); 

     return ( 
         <div className="animate-fade-in bg-white p-6 rounded-2xl shadow-xl"> 
            {/* Pulsante di ritorno */}
            <button 
                onClick={onBack} 
                className="flex items-center gap-2 text-gray-600 mb-6 hover:text-gray-800 hover:underline"
            >
                <ArrowLeftIcon className="h-4 w-4" />
                Torna al Menu Assegnazioni
            </button>

             <h2 className="text-3xl font-bold text-gray-800 mb-6">Gestione Assegnazioni</h2> 
             <div className="overflow-x-auto">
    {/* Non è più necessario usare prettier-ignore se la struttura è corretta */}
    <table className="w-full bg-white table-auto">
        <thead className="bg-gray-50">
            <tr>
                <SortableHeader label="Attrezzatura" sortKey="attrezzaturaNome" />
                <SortableHeader label="Assegnato a" sortKey="utenteNome" />
                <SortableHeader label="Data Assegnazione" sortKey="dataAssegnazione" />
                <SortableHeader label="Stato" sortKey="statoWorkflow" />
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
            </tr>
        </thead>
        <tbody>
            {sortedAssegnazioni.length > 0 ? (
                sortedAssegnazioni.map(assegnazione => (
                    <tr key={assegnazione.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">{assegnazione.attrezzaturaNome} <span className="text-gray-500">({assegnazione.attrezzaturaSeriale})</span></td>
                        <td className="py-4 px-4 text-sm text-gray-500">{assegnazione.utenteNome}</td>
                        <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">
                            {assegnazione.dataAssegnazione?.seconds ? new Date(assegnazione.dataAssegnazione.seconds * 1000).toLocaleDateString() : 'N/D'}
                        </td>
                        <td className="py-4 px-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                assegnazione.statoWorkflow === 'attiva' ? 'bg-green-100 text-green-800' :
                                    assegnazione.statoWorkflow === 'da confermare' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                {assegnazione.statoWorkflow.replace(/-/g, ' ')}
                            </span>
                        </td>
                        <td className="py-4 px-4 text-sm font-medium">
                            <button
                                onClick={() => setLocalView('dettagli-assegnazione', assegnazione)}
                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                                <EyeIcon className="h-5 w-5" />
                                Dettagli
                            </button>
                        </td>
                    </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="5" className="py-8 px-4 text-center text-gray-500">Nessuna assegnazione trovata.</td>
                </tr>
            )}
        </tbody>
    </table>
</div> 
         </div> 
     ); 
 };