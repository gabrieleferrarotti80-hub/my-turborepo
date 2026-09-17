import React, { useState, useMemo } from 'react';
import { useFirebaseData } from 'shared-core';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { WrenchScrewdriverIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export const SubappaltatoriContent = () => {
    const { db, data, loadingData, companyID } = useFirebaseData();
    const subappaltatori = data?.subappaltatori || [];
    
    const [view, setView] = useState('list');
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const subappaltatoriFiltrati = useMemo(() => {
        return subappaltatori
            .filter(f => (f.ragioneSociale || '').toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => (a.ragioneSociale || '').localeCompare(b.ragioneSociale || ''));
    }, [subappaltatori, searchQuery]);

    const handleSaveSubappaltatore = async (e) => {
        e.preventDefault();
        try {
            const docId = selectedItem.id || Date.now().toString();
            await setDoc(doc(db, 'subappaltatori', docId), { ...selectedItem, id: docId, companyID });
            setView('list');
            alert("✅ Subappaltatore salvato con successo!");
        } catch (error) { alert("Errore: " + error.message); }
    };

    const handleDeleteSubappaltatore = async (id) => {
        if(confirm("Eliminare questo subappaltatore? Le fatture collegate non verranno eliminate.")) {
            await deleteDoc(doc(db, 'subappaltatori', id));
        }
    };

    if (loadingData) return <div className="p-8 text-center text-gray-500 animate-pulse">Caricamento albo...</div>;

    if (view === 'form') {
        return (
            <div className="p-6 max-w-3xl mx-auto animate-fade-in-down">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{selectedItem?.id ? 'Modifica Subappaltatore' : 'Nuovo Subappaltatore'}</h2>
                    <button onClick={() => setView('list')} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 shadow-sm hover:bg-gray-50">Annulla</button>
                </div>
                <form onSubmit={handleSaveSubappaltatore} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ragione Sociale *</label><input required type="text" value={selectedItem?.ragioneSociale || ''} onChange={e => setSelectedItem({...selectedItem, ragioneSociale: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 bg-gray-50 p-2.5" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Partita IVA *</label><input required type="text" maxLength={11} value={selectedItem?.partitaIva || ''} onChange={e => setSelectedItem({...selectedItem, partitaIva: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 bg-gray-50 p-2.5 font-mono" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Codice Fiscale</label><input type="text" maxLength={16} value={selectedItem?.codiceFiscale || ''} onChange={e => setSelectedItem({...selectedItem, codiceFiscale: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 bg-gray-50 p-2.5 font-mono" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email / PEC</label><input type="email" value={selectedItem?.email || ''} onChange={e => setSelectedItem({...selectedItem, email: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 bg-gray-50 p-2.5" /></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">IBAN</label><input type="text" value={selectedItem?.iban || ''} onChange={e => setSelectedItem({...selectedItem, iban: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 bg-gray-50 p-2.5 font-mono text-sm" /></div>
                        <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria / Lavorazione (Es. Posatore, Elettricista)</label><input type="text" value={selectedItem?.categoria || ''} onChange={e => setSelectedItem({...selectedItem, categoria: e.target.value})} className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 bg-gray-50 p-2.5" /></div>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow hover:bg-indigo-700">Salva Anagrafica</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Albo Subappaltatori</h1>
                    <p className="text-gray-500 mt-1">Anagrafiche delle aziende esterne che prestano manodopera/servizi.</p>
                </div>
                <button onClick={() => { setSelectedItem({}); setView('form'); }} className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-md transition-colors">
                    <PlusIcon className="h-5 w-5"/> Nuovo Subappaltatore
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><WrenchScrewdriverIcon className="h-5 w-5 text-indigo-500"/> Elenco Aziende</h3>
                <div className="relative w-full sm:w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="Cerca ragione sociale..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-indigo-500 bg-gray-50" />
                </div>
            </div>

            {subappaltatoriFiltrati.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200"><WrenchScrewdriverIcon className="h-12 w-12 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">Nessun subappaltatore trovato.</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subappaltatoriFiltrati.map(forn => (
                        <div key={forn.id} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="absolute top-6 right-6 bg-indigo-50 p-2 rounded-lg text-indigo-600">
                                <WrenchScrewdriverIcon className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1 pr-12 line-clamp-2">{forn.ragioneSociale}</h3>
                            <p className="text-xs text-gray-500 font-mono mb-4">P.IVA: {forn.partitaIva}</p>
                            
                            <div className="space-y-3 mb-6">
                                {forn.categoria && <p className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md inline-block font-medium">{forn.categoria}</p>}
                                {forn.email && <p className="text-sm text-gray-600 truncate flex items-center gap-2"><span>📧</span> {forn.email}</p>}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                <button onClick={() => handleDeleteSubappaltatore(forn.id)} className="text-sm text-red-400 hover:text-red-600 font-bold transition-colors">Elimina</button>
                                <button onClick={() => { setSelectedItem(forn); setView('form'); }} className="text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-colors">Modifica Dati</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};