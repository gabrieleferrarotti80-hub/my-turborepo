import React, { useState, useMemo } from 'react';
import { useFirebaseData } from 'shared-core';
import { doc, setDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { FatturaAcquistoForm } from 'shared-ui'; 
import { 
    DocumentTextIcon, PlusIcon, CheckCircleIcon, ExclamationCircleIcon, ClockIcon,
    MagnifyingGlassIcon, PencilIcon, TrashIcon
} from '@heroicons/react/24/outline';

export const AcquistiContent = () => {
    const { db, data, loadingData, companyID } = useFirebaseData();
    
    const fornitori = data?.fornitori || [];
    const fatture = data?.fatture_acquisto || [];
    const cantieri = data?.cantieri || [];
    const subappaltatori = data?.subappaltatori || [];
    const noleggiatori = data?.noleggiatori || [];

    // 🌟 ECCO LA LOGICA PER UNIRE ORDINI E PREVENTIVI 🌟
    const ordiniAcquisto = data?.ordini_acquisto || [];
    const preventiviFornitori = data?.preventivi_fornitori || [];
    const tuttiGliOrdini = useMemo(() => [...ordiniAcquisto, ...preventiviFornitori], [ordiniAcquisto, preventiviFornitori]);

    const [view, setView] = useState('list'); 
    const [selectedItem, setSelectedItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const stats = useMemo(() => {
        let totaleDaPagare = 0;
        let totaleScaduto = 0;
        let totalePagatoMese = 0;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        fatture.forEach(f => {
            const isPagata = f.stato === 'pagata';
            const importo = Number(f.totaleDocumento || f.totale || 0);
            const dataScad = f.scadenzaPagamento || f.dataScadenza;
            const dFattura = new Date(f.dataFattura || f.createdAt);

            if (!isPagata && f.stato !== 'annullata') {
                totaleDaPagare += importo;
                if (dataScad && new Date(dataScad) < today) {
                    totaleScaduto += importo;
                }
            }

            if (isPagata && dFattura.getMonth() === currentMonth && dFattura.getFullYear() === currentYear) {
                totalePagatoMese += importo;
            }
        });

        return { totaleDaPagare, totaleScaduto, totalePagatoMese, numFatture: fatture.length };
    }, [fatture]);

    const fattureFiltrate = useMemo(() => {
        return fatture
            .filter(f => 
                (f.fornitoreNome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (f.numeroFattura || '').toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => new Date(b.dataFattura || b.createdAt) - new Date(a.dataFattura || a.createdAt));
    }, [fatture, searchQuery]);

    const handleSaveFattura = async (fatturaData) => {
        try {
            const docId = fatturaData.id || Date.now().toString();
            
            // 🌟 MAGIA: INTERCETTATORE SALA D'ATTESA PER LE FATTURE (COMPARATORE) 🌟
            if (fatturaData.articolo && !fatturaData.metadata) {
                const mapCategoriaToTipo = { materiali: 'materiale', noleggi: 'nolo', subappalti: 'subappalto' };
                const tipo = mapCategoriaToTipo[fatturaData.categoriaCosto];
                
                if (tipo) {
                    await addDoc(collection(db, 'catalogo_pending'), {
                        testoOriginale: fatturaData.articolo,
                        tipoArticolo: tipo,
                        companyID: companyID,
                        stato: 'da_approvare',
                        dataInserimento: new Date().toISOString()
                    });
                }
            }

            const payload = { ...fatturaData, id: docId, companyID, updatedAt: new Date().toISOString() };
            delete payload.metadata;

            await setDoc(doc(db, 'fatture_acquisto', docId), payload);
            setView('list');
            alert("✅ Fattura salvata con successo!");
        } catch (error) { alert("Errore: " + error.message); }
    };

    const handleDeleteFattura = async (id) => {
        if(confirm("Eliminare questa fattura? L'azione è irreversibile.")) {
            await deleteDoc(doc(db, 'fatture_acquisto', id));
        }
    };

    if (loadingData) return <div className="p-8 text-center text-gray-500 animate-pulse">Caricamento cruscotto acquisti...</div>;

    if (view === 'add_fattura' || view === 'edit_fattura') {
        return <FatturaAcquistoForm 
            onBack={() => setView('list')} 
            onSave={handleSaveFattura} 
            fornitori={fornitori} 
            subappaltatori={subappaltatori} 
            noleggiatori={noleggiatori} 
            cantieri={cantieri} 
            ordini={tuttiGliOrdini} // 🌟 PASSAGGIO DATI AL FORM
            initialData={view === 'edit_fattura' ? selectedItem : null} 
        />;
    }

    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-50 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Fatture di Acquisto & Spese</h1>
                    <p className="text-gray-500 mt-1">Gestisci le fatture passive, lo scadenziario e i pagamenti.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => { setSelectedItem(null); setView('add_fattura'); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-md transition-colors">
                        <PlusIcon className="h-5 w-5"/> Registra Fattura Passiva
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><DocumentTextIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fatture a Sistema</p>
                        <p className="text-2xl font-extrabold text-gray-900">{stats.numFatture}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl"><ClockIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Da Pagare (Totale)</p>
                        <p className="text-2xl font-extrabold text-gray-900">€ {stats.totaleDaPagare.toLocaleString('it-IT')}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-red-100 ring-1 ring-red-50 flex items-center gap-4 relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-red-500"></div>
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl"><ExclamationCircleIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Scadute (Allarme)</p>
                        <p className="text-2xl font-extrabold text-red-700">€ {stats.totaleScaduto.toLocaleString('it-IT')}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircleIcon className="h-8 w-8"/></div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pagate questo mese</p>
                        <p className="text-2xl font-extrabold text-green-700">€ {stats.totalePagatoMese.toLocaleString('it-IT')}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="font-bold text-gray-800">Elenco Documenti</h3>
                <div className="relative w-full sm:w-72">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="Cerca fattura o ditta..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-indigo-500 bg-gray-50" />
                </div>
            </div>

            <div className="bg-white rounded-b-2xl shadow-sm border border-t-0 border-gray-200 min-h-[400px]">
                <div className="overflow-x-auto">
                    {fattureFiltrate.length === 0 ? (
                        <div className="text-center py-16"><DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-3"/><p className="text-gray-500 font-medium">Nessuna fattura trovata.</p></div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Ditta Fornitrice</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider">Cantiere Dest.</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-right">Importo</th>
                                    <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-wider text-center">Stato Pagamento</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {fattureFiltrate.map((fatt) => {
                                    const isScaduta = fatt.stato !== 'pagata' && fatt.scadenzaPagamento && new Date(fatt.scadenzaPagamento) < new Date();
                                    return (
                                        <tr key={fatt.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-900">Fatt. {fatt.numeroFattura}</p>
                                                <p className="text-xs text-gray-500">{new Date(fatt.dataFattura || fatt.createdAt).toLocaleDateString('it-IT')}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-indigo-700">{fatt.fornitoreNome}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{fatt.categoriaCosto || 'N/D'}</p>
                                                {fatt.articolo && <p className="text-xs text-gray-600 mt-1 font-medium bg-gray-100 px-2 py-0.5 rounded inline-block">📦 {fatt.articolo}</p>}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-medium">{fatt.nomeCantiere || 'Generico / Sede'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-extrabold text-gray-900">€ {Number(fatt.totaleDocumento || fatt.totale || 0).toLocaleString('it-IT')}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {fatt.stato === 'pagata' ? (
                                                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold"><CheckCircleIcon className="h-4 w-4"/> Pagata</span>
                                                ) : isScaduta ? (
                                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse"><ExclamationCircleIcon className="h-4 w-4"/> Scaduta</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full text-xs font-bold"><ClockIcon className="h-4 w-4"/> In Scadenza</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setSelectedItem(fatt); setView('edit_fattura'); }} className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 rounded-lg shadow-sm"><PencilIcon className="h-4 w-4"/></button>
                                                    <button onClick={() => handleDeleteFattura(fatt.id)} className="p-2 bg-white border border-gray-200 text-gray-500 hover:text-red-600 rounded-lg shadow-sm"><TrashIcon className="h-4 w-4"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};