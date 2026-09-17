import React, { useState, useMemo } from 'react';
import { useFirebaseData, useMagazzinoManager, useManutenzioniManager } from 'shared-core'; 
import { useTheme } from 'shared-ui'; 
import { 
    AggiungiAttrezzaturaForm, 
    ModificaArticoloForm,
    GestioneArchivioView
} from 'shared-ui'; 
import { 
    PlusIcon, 
    WrenchScrewdriverIcon, 
    ArrowPathRoundedSquareIcon, 
    TrashIcon, 
    PencilSquareIcon,
    UserIcon,
    BuildingOfficeIcon,
    ArrowDownTrayIcon // ✅ NUOVA ICONA EXPORT
} from '@heroicons/react/24/solid';

// --- HELPER ESPORTAZIONE CSV OTTIMIZZATO PER EXCEL ITALIANO ---
const downloadCSV = (data, filename) => {
    if (!data || !data.length) return;
    
    const headers = Object.keys(data[0]);
    // ✅ FIX 1: Usiamo il punto e virgola come separatore per Excel in italiano
    const separator = ';';
    const csvRows = [headers.join(separator)];
    
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
            // Puliamo eventuali "a capo" dentro le note che potrebbero rompere la struttura di Excel
            const cleanVal = val.replace(/(\r\n|\n|\r)/gm, " ");
            return `"${cleanVal.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(separator));
    }
    
    // ✅ FIX 2: Aggiungiamo il BOM (\uFEFF) per forzare Excel a leggere accenti e caratteri speciali (UTF-8)
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
};

export const AttrezzatureView = () => {
    
    const { db, storage, user, userAziendaId, data, loadingAuth, loadingData } = useFirebaseData();
    
    const { 
        addAttrezzatura, 
        updateArticolo, 
        deleteArticolo, 
        isLoading: isMagazzinoLoading 
    } = useMagazzinoManager(db, storage, user, userAziendaId);

    const { addScadenza, isLoading: isManutenzioniLoading } = useManutenzioniManager(db, user, userAziendaId);
    
    const isLoading = isMagazzinoLoading || isManutenzioniLoading;
    const { primaryColor, colorClasses } = useTheme();
    const [view, setView] = useState('magazzino'); 
    const [selectedItem, setSelectedItem] = useState(null);
    const [message, setMessage] = useState('');

    const attrezzature = useMemo(() => 
        (data?.attrezzature || []).filter(a => a.tipoArticolo === 'attrezzatura'),
    [data?.attrezzature]);

    const usersList = data?.users || [];
    const cantieriList = data?.cantieri || [];

    // --- FUNZIONE ESPORTAZIONE INVENTARIO ---
    const handleExportInventario = () => {
        const dataToExport = attrezzature.map(item => {
            // Risolviamo il nome dell'assegnatario in chiaro
            const dipendente = usersList.find(u => u.id === item.assegnatoA);
            const cantiere = cantieriList.find(c => c.id === item.assegnatoA);
            let assegnatario = 'In Sede';
            if (item.stato === 'in uso' || item.stato === 'in_uso') {
                 if (dipendente) assegnatario = `${dipendente.nome} ${dipendente.cognome}`;
                 else if (cantiere) assegnatario = cantiere.nomeCantiere;
                 else assegnatario = 'Assegnato (Dato Mancante)';
            }

            return {
                "Nome Asset": item.nome || '',
                "Categoria": item.categoria || '',
                "Marca": item.dettagli?.marca || item.marca || '',
                "Modello": item.dettagli?.modello || item.modello || '',
                "Seriale o Targa": item.seriale || item.targa || '',
                "Stato Attuale": item.stato || '',
                "In Carico A": assegnatario,
                "Costo d'Acquisto (€)": item.costoAcquisto || item.dettagli?.costoAcquisto || 0,
                "Costo Orario Nolo (€)": item.costoOrario || 0
            };
        });
        downloadCSV(dataToExport, `Inventario_Aziendale_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const renderAssegnatario = (assegnatoA_Id, stato) => {
        const isActuallyInUse = stato === 'in uso' || stato === 'in_uso';
        if (!isActuallyInUse || !assegnatoA_Id) {
            return <span className="text-slate-400 italic text-xs font-medium pl-2">In Sede</span>;
        }

        const dipendente = usersList.find(u => u.id === assegnatoA_Id);
        if (dipendente) {
            return (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm w-max">
                    <UserIcon className="w-3.5 h-3.5 opacity-80" />
                    {dipendente.nome} {dipendente.cognome}
                </div>
            );
        }

        const cantiere = cantieriList.find(c => c.id === assegnatoA_Id);
        if (cantiere) {
            return (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 shadow-sm w-max">
                    <BuildingOfficeIcon className="w-3.5 h-3.5 opacity-80" />
                    {cantiere.nomeCantiere}
                </div>
            );
        }

        return <span className="text-slate-400 text-xs italic pl-2">ID Sconosciuto</span>;
    };

    const renderStatusBadge = (statoOriginale) => {
        const stato = (statoOriginale || '').toLowerCase();
        
        if (stato === 'disponibile') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    Disponibile
                </span>
            );
        }
        if (stato === 'in uso' || stato === 'in_uso') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    In Uso
                </span>
            );
        }
        if (stato === 'in riparazione') {
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    In Officina
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                {statoOriginale}
            </span>
        );
    };

    const handleSaveSuccess = (msg) => {
        setMessage(msg);
        setView('magazzino');
        setSelectedItem(null);
    };

    const handleSaveNew = async (dati, file) => {
        const res = await addAttrezzatura(dati, file);
        return res; 
    };

    const handleSaveEdit = async (dati) => {
        const res = await updateArticolo(selectedItem.id, dati);
        return res;
    };

    const handleDelete = async (item) => {
        if (window.confirm(`Sei sicuro di voler eliminare "${item.nome}" dall'inventario? Questa azione è irreversibile.`)) {
            const res = await deleteArticolo(item.id);
            if (res.success) setMessage(res.message);
            else alert("Errore: " + res.message);
        }
    };

    const NavButton = ({ targetView, label, icon: Icon }) => (
        <button 
            onClick={() => setView(targetView)} 
            className={`flex items-center gap-2 py-2 px-5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                view === targetView 
                ? `${colorClasses[primaryColor].bg} text-white shadow-lg ring-2 ring-offset-2 ring-indigo-500/30` 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow'
            }`}
        >
            {Icon && <Icon className="h-4 w-4" />}
            {label}
        </button>
    );

    if (loadingAuth || loadingData) return <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Caricamento Asset e Inventario...</div>;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Parco Attrezzature</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Controlla macchinari, mezzi e verifica chi li ha in carico.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <NavButton targetView="magazzino" label="Inventario Completo" />
                    <NavButton targetView="archivio" label="Storico Assoluto" icon={ArrowPathRoundedSquareIcon} />
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-center font-bold text-sm shadow-sm animate-fade-in ${message.includes('eliminat') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message}
                </div>
            )}

            {view === 'magazzino' && (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden animate-fade-in">
                    
                    <div className="p-5 border-b border-slate-200 flex flex-wrap gap-4 justify-between items-center bg-slate-50/80 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl"><WrenchScrewdriverIcon className="h-6 w-6"/></div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Elenco Asset Aziendali</h3>
                                <p className="text-xs text-slate-500 font-medium">Totale: {attrezzature.length} elementi censiti</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleExportInventario} 
                                className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-100 shadow-sm transition-all"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4"/> Esporta CSV
                            </button>
                            <button 
                                onClick={() => setView('add')} 
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                            >
                                <PlusIcon className="h-5 w-5"/> Nuovo Asset
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100/70">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider leading-4">Asset e Categoria</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider leading-4">Targa / Seriale</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider leading-4">Stato Attuale</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-slate-600 uppercase tracking-wider leading-4">Assegnato A</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-600 uppercase tracking-wider leading-4">Valore/Costo (h)</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-extrabold text-slate-600 uppercase tracking-wider leading-4">Gestione</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {attrezzature.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="p-4 bg-slate-100 rounded-full mb-4"><WrenchScrewdriverIcon className="h-10 w-10 text-slate-400" /></div>
                                                <p className="text-slate-600 font-bold text-lg">Il tuo magazzino è vuoto.</p>
                                                <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">Non hai ancora registrato nessuna attrezzatura. Clicca su "Nuovo Asset" in alto a destra per iniziare.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    attrezzature.map(item => (
                                        <tr key={item.id} className="odd:bg-white even:bg-slate-50/60 hover:bg-indigo-50/40 transition-colors group">
                                            
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-[15px]">{item.nome}</span>
                                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">{item.categoria}</span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-5">
                                                {item.seriale ? (
                                                    <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-300 px-3 py-1.5 rounded-md shadow-sm tracking-tight">
                                                        {item.seriale}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic pl-2">-</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-5">
                                                {renderStatusBadge(item.stato)}
                                            </td>

                                            <td className="px-6 py-5">
                                                {renderAssegnatario(item.assegnatoA, item.stato)}
                                            </td>

                                            <td className="px-6 py-5 text-right">
                                                {item.costoOrario ? (
                                                    <span className="font-mono font-bold text-slate-700 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200 inline-block shadow-sm">
                                                        € {Number(item.costoOrario).toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 pr-4">-</span>
                                                )}
                                            </td>

                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-all duration-200">
                                                    <button 
                                                        onClick={() => { setSelectedItem(item); setView('edit'); }} 
                                                        className="text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all"
                                                        title="Modifica Dati Asset"
                                                    >
                                                        <PencilSquareIcon className="h-5 w-5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(item)} 
                                                        className="text-red-600 bg-white hover:bg-red-50 border border-slate-300 hover:border-red-300 p-2.5 rounded-xl shadow-sm hover:shadow-md transition-all"
                                                        title="Elimina Definitivamente"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
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
            )}

            {view === 'add' && (
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
                    <AggiungiAttrezzaturaForm 
                        onBack={() => setView('magazzino')}
                        onSaveSuccess={handleSaveSuccess} 
                        addAttrezzatura={handleSaveNew} 
                        addScadenza={addScadenza} 
                        isAdding={isLoading}
                    />
                </div>
            )}

            {view === 'edit' && selectedItem && (
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
                    <ModificaArticoloForm 
                        initialData={selectedItem} 
                        onBack={() => { setView('magazzino'); setSelectedItem(null); }} 
                        onSaveSuccess={handleSaveSuccess} 
                        updateArticolo={handleSaveEdit} 
                        addScadenza={addScadenza} 
                        isLoading={isLoading} 
                    />
                </div>
            )}

            {view === 'archivio' && (
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
                    <GestioneArchivioView 
                        archivioAttrezzature={data?.archivioAttrezzatura || []} 
                        assegnazioni={data?.assegnazioniMagazzino || []}
                        attrezzature={attrezzature}
                        utenti={usersList}
                        cantieri={cantieriList}
                        onBack={() => setView('magazzino')}
                    />
                </div>
            )}

        </div>
    );
};