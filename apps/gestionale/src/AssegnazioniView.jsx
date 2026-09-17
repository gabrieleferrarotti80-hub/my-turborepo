import React, { useState, useMemo } from 'react';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { useFirebaseData, useAssegnazioniManager, useMagazzinoManager } from 'shared-core'; 
import { useTheme } from 'shared-ui';
import { 
    AssegnaAttrezzaturaForm,
    GestioneAssegnazioniMagazzinoView, 
    DettagliAssegnazioneView
} from 'shared-ui';
import { 
    ClipboardDocumentCheckIcon, 
    PlusIcon 
} from '@heroicons/react/24/outline';

export const AssegnazioniView = () => {
    const { db, user, userAziendaId, data, loadingData, storage } = useFirebaseData();
    const { primaryColor, colorClasses } = useTheme();

    // ✅ Aggiunti i cantieri per risolvere correttamente i nomi delle destinazioni
    const { attrezzature = [], assegnazioniMagazzino = [], users = [], cantieri = [] } = data || {};

    const { 
        confermaPresaInCarico,      
        segnalaGuasto,       
        richiediRestituzione,       
        isLoading: isAssigningManager      
    } = useAssegnazioniManager(db, user, userAziendaId);

    const { creaAssegnazioniMultiple, isLoading: isMagazzinoLoading } = useMagazzinoManager(db, storage, user, userAziendaId);
    
    const isLoading = isAssigningManager || isMagazzinoLoading || loadingData; 
    
    const [view, setView] = useState('registro'); 
    const [selectedItem, setSelectedItem] = useState(null);
    const [message, setMessage] = useState('');

    const handleSaveSuccess = (msg) => { 
        setMessage(msg); 
        setView('registro'); 
        setSelectedItem(null);
    };

    // --- NORMALIZZAZIONE DATI E RECUPERO ORFANI ---
    const assegnazioniSicure = useMemo(() => {
        
        // 1. Mappiamo i ticket REALI
        const reali = (assegnazioniMagazzino || []).map(a => {
            let dataLeggibile = null;
            if (a.dataAssegnazione) dataLeggibile = a.dataAssegnazione.toDate ? a.dataAssegnazione.toDate() : new Date(a.dataAssegnazione);
            
            let statoReale = (a.statoWorkflow || a.stato || 'attiva').toLowerCase().trim();
            if (a.dataConferma || a.stato === 'in uso' || a.stato === 'in_uso') {
                if (statoReale === 'da confermare' || statoReale === 'attiva') statoReale = 'in uso';
            }

            // Assicuriamoci di avere il nome corretto (Dipendente o Cantiere)
            let nomeAssegnatario = a.assegnatoA_Nome || a.utenteNome || a.dipendente;
            if (!nomeAssegnatario && a.assegnatoA) {
                const dipendente = users.find(u => u.id === a.assegnatoA);
                if (dipendente) nomeAssegnatario = `${dipendente.nome} ${dipendente.cognome}`;
                else {
                    const cantiere = cantieri.find(c => c.id === a.assegnatoA);
                    if (cantiere) nomeAssegnatario = cantiere.nomeCantiere;
                }
            }

            return {
                ...a,
                nome: a.articoloNome || 'Articolo Sconosciuto', 
                attrezzatura: a.articoloNome || 'Articolo Sconosciuto',
                seriale: a.articoloSeriale || '', 
                dipendente: nomeAssegnatario || 'Utente Sconosciuto',
                assegnatoA_Nome: nomeAssegnatario || 'Utente Sconosciuto',
                data: dataLeggibile, 
                dataAssegnazione: dataLeggibile, 
                statoWorkflow: statoReale
            };
        });

        // 2. RECUPERO ORFANI (Attrezzi 'in uso' senza un ticket valido)
        const attiveReali = reali.filter(a => a.statoWorkflow !== 'conclusa' && a.statoWorkflow !== 'dismessa');
        const idAssegnati = attiveReali.map(a => a.articoloId || a.attrezzaturaId);

        const orfani = attrezzature.filter(item => 
            (item.stato === 'in uso' || item.stato === 'in_uso') && !idAssegnati.includes(item.id)
        ).map(item => {
            let nomeAssegnatario = 'Destinazione Sconosciuta';
            if (item.assegnatoA) {
                const dipendente = users.find(u => u.id === item.assegnatoA);
                if (dipendente) nomeAssegnatario = `${dipendente.nome} ${dipendente.cognome}`;
                else {
                    const cantiere = cantieri.find(c => c.id === item.assegnatoA);
                    if (cantiere) nomeAssegnatario = cantiere.nomeCantiere;
                }
            }

            return {
                id: `virtual-${item.id}`,
                articoloId: item.id,
                articoloNome: item.nome,
                articoloSeriale: item.seriale,
                categoria: item.categoria,
                assegnatoA: item.assegnatoA,
                assegnatoA_Nome: nomeAssegnatario,
                dipendente: nomeAssegnatario,
                dataAssegnazione: item.updatedAt ? (item.updatedAt.toDate ? item.updatedAt.toDate() : new Date(item.updatedAt)) : new Date(),
                statoWorkflow: 'in uso',
                isVirtual: true // Segnale per l'interfaccia
            };
        });

        return [...reali, ...orfani];

    }, [assegnazioniMagazzino, attrezzature, users, cantieri]);

   const assegnazioniAttive = useMemo(() => 
    assegnazioniSicure.filter(a => 
        a.statoWorkflow !== 'conclusa' && 
        a.statoWorkflow !== 'dismessa' &&
        a.statoWorkflow !== 'riparazione_completata' // <--- AGGIUNGI QUESTA RIGA
    ), 
[assegnazioniSicure]);

    // --- UI COMPONENTS E RENDER ---
    const NavButton = ({ targetView, label, icon: Icon }) => {
        const isActive = view === targetView || (view === 'dettagli' && targetView === 'registro');
        return (
            <button 
                onClick={() => { setView(targetView); setSelectedItem(null); setMessage(''); }} 
                className={`flex items-center gap-2 py-2 px-5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    isActive
                    ? `${colorClasses[primaryColor].bg} text-white shadow-lg ring-2 ring-offset-2 ring-indigo-500/30` 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow'
                }`}
            >
                {Icon && <Icon className="h-4 w-4" />}
                {label}
            </button>
        );
    };

    if (loadingData) return <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Caricamento Assegnazioni...</div>;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-fade-in">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Registro Assegnazioni</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Gestisci le dotazioni in uso ai dipendenti o ai cantieri.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <NavButton targetView="registro" label="Assegnazioni Attive" icon={ClipboardDocumentCheckIcon} />
                    <NavButton targetView="nuova" label="Nuova Assegnazione" icon={PlusIcon} />
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-center font-bold text-sm shadow-sm animate-fade-in ${message.includes('Errore') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message}
                </div>
            )}

            {view === 'registro' && (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 animate-fade-in overflow-hidden">
                    <GestioneAssegnazioniMagazzinoView 
                        assegnazioni={assegnazioniAttive} 
                        attrezzature={attrezzature} // Passiamo l'inventario per i Tab
                        setLocalView={(v, item) => { setSelectedItem(item); setView('dettagli'); }} 
                    />
                </div>
            )}

            {view === 'nuova' && (
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
                    <AssegnaAttrezzaturaForm 
                        onBack={() => setView('registro')} 
                        onSaveSuccess={handleSaveSuccess} 
                        creaAssegnazioniMultiple={creaAssegnazioniMultiple} 
                        dipendenti={users} 
                        magazzino={attrezzature} 
                        isLoading={isLoading} 
                    />
                </div>
            )}

            {view === 'dettagli' && selectedItem && (
                <div className="bg-white p-8 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
                    <DettagliAssegnazioneView 
                        assegnazione={selectedItem} 
                        onBack={() => setView('registro')} 
                        confermaPresaInCarico={confermaPresaInCarico} 
                        segnalaGuasto={segnalaGuasto} 
                        richiediRestituzione={richiediRestituzione} 
                        onActionSuccess={handleSaveSuccess} 
                    />
                </div>
            )}

        </div>
    );
};