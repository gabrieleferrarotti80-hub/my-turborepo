import React, { useState, useMemo } from 'react';
import { doc, updateDoc, deleteField, writeBatch } from 'firebase/firestore';
import { useFirebaseData, useManutenzioniManager, useMagazzinoManager, useAssegnazioniManager } from 'shared-core';
import { useTheme } from 'shared-ui';
import { 
    GestioneManutenzioniView, 
    GestioneGuastiView, 
    GestioneRiconsegneView 
} from 'shared-ui';
import { 
    ClockIcon, 
    WrenchScrewdriverIcon, 
    ArrowPathIcon 
} from '@heroicons/react/24/outline';

export const ManutenzioniContent = () => {
    const { db, storage, user, userAziendaId, data, loadingData } = useFirebaseData();
    const { primaryColor, colorClasses } = useTheme();

    const [activeTab, setActiveTab] = useState('scadenze');
    const [message, setMessage] = useState('');

    const handleActionComplete = (msg) => {
        setMessage(msg);
        setTimeout(() => setMessage(''), 4000);
    };

    // --- MANAGERS ---
    const { 
        addScadenza, completaManutenzione, deleteScadenza, isLoading: isManutenzioniLoading 
    } = useManutenzioniManager(db, user, userAziendaId);

    const { 
        accettaSegnalazione, risolviRiparazione, isLoading: isMagazzinoLoading 
    } = useMagazzinoManager(db, storage, user, userAziendaId);

    const { 
        accettaRestituzione, isLoading: isAssegnazioniLoading 
    } = useAssegnazioniManager(db, user, userAziendaId);

    const isLoading = isManutenzioniLoading || isMagazzinoLoading || isAssegnazioniLoading || loadingData;

    // --- DATI E NORMALIZZAZIONE ---
    const { attrezzature = [], scadenze_mezzi = [], assegnazioniMagazzino = [] } = data || {};

    const assegnazioniSicure = useMemo(() => {
        return assegnazioniMagazzino.map(a => {
            let dataLeggibile = null;
            if (a.dataAssegnazione) dataLeggibile = a.dataAssegnazione.toDate ? a.dataAssegnazione.toDate() : new Date(a.dataAssegnazione);
            return {
                ...a,
                nome: a.articoloNome || 'Articolo Sconosciuto', 
                attrezzatura: a.articoloNome || 'Articolo Sconosciuto',
                seriale: a.articoloSeriale || '', 
                dipendente: a.assegnatoA_Nome || 'Utente Sconosciuto',
                assegnatoA: a.assegnatoA_Nome || 'Utente Sconosciuto',
                data: dataLeggibile, 
                dataAssegnazione: dataLeggibile, 
                statoWorkflow: a.statoWorkflow || a.stato || 'attiva'
            };
        });
    }, [assegnazioniMagazzino]);

    // --- FILTRI ---
    const guastiAttivi = useMemo(() => {
        const statiNormali = ['attiva', 'in uso', 'da confermare', 'conclusa', 'restituzione richiesta', 'dismessa', 'riparazione_completata'];
        return assegnazioniSicure.filter(a => !statiNormali.includes(a.statoWorkflow.toLowerCase().trim()));
    }, [assegnazioniSicure]);
    
    const riconsegneRichieste = useMemo(() => 
        assegnazioniSicure.filter(a => a.statoWorkflow === 'restituzione richiesta'), 
    [assegnazioniSicure]);

    const itemsInRiparazione = useMemo(() => 
        attrezzature.filter(item => item.stato === 'in riparazione'),
    [attrezzature]);


    // --- FUNZIONI CUSTOM PORTATE DAL VECCHIO REGISTRO ASSEGNAZIONI ---
    const annullaSegnalazione = async (id) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, 'assegnazioniMagazzino', id), {
                statoWorkflow: 'in uso',
                noteGuasto: deleteField(),
                dataGuasto: deleteField()
            });
            return { success: true, message: "Segnalazione annullata. L'articolo è di nuovo in uso." };
        } catch (err) { return { success: false, message: err.message }; }
    };

   const dismettiArticolo = async (assegnazioneId, attrezzaturaId) => {
        if (!db) return;
        try {
            // Usiamo il batch per fare due operazioni in un colpo solo!
           
            const batch = writeBatch(db);
            
            batch.update(doc(db, 'assegnazioniMagazzino', assegnazioneId), {
                statoWorkflow: 'dismessa',
                stato: 'dismessa',
                dataDismissione: new Date(),
                noteDismissione: "Dismesso da gestione guasti"
            });

            if (attrezzaturaId) {
                batch.update(doc(db, 'attrezzature', attrezzaturaId), {
                    stato: 'dismesso',
                    updatedAt: new Date()
                });
            }

            await batch.commit();
            return { success: true, message: "Articolo dismesso e rimosso dall'inventario." };
        } catch (err) { return { success: false, message: err.message }; }
    };

    const rifiutaRestituzione = async (assegnazioneId) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, 'assegnazioniMagazzino', assegnazioneId), {
                statoWorkflow: 'in uso',
                noteRestituzione: deleteField(),
                dataRichiestaRestituzione: deleteField()
            });
            return { success: true, message: "Restituzione rifiutata. L'oggetto rimane in uso." };
        } catch (error) { return { success: false, message: error.message }; }
    };

    // --- UI COMPONENT: BOTTONE TAB CON BADGE NOTIFICA ---
    const NavButton = ({ targetTab, label, icon: Icon, count = 0 }) => {
        const isActive = activeTab === targetTab;
        return (
            <button 
                onClick={() => setActiveTab(targetTab)} 
                className={`relative flex items-center gap-2 py-2.5 px-5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    isActive
                    ? `${colorClasses[primaryColor].bg} text-white shadow-lg ring-2 ring-offset-2 ring-indigo-500/30` 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm hover:shadow'
                }`}
            >
                {Icon && <Icon className="h-5 w-5" />}
                {label}
                {/* Badge di notifica rosso */}
                {count > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse border-2 border-white">
                        {count}
                    </span>
                )}
            </button>
        );
    };

    // --- RENDER MAIN ---
    if (loadingData) return <div className="p-10 text-center text-slate-500 font-medium animate-pulse">Caricamento Officina e Dati...</div>;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-fade-in">
            
            {/* HEADER E TABS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    {/* ✅ MODIFICATO QUI: Solo "Officina" */}
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Officina</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Controlla le revisioni, gestisci i resi e risolvi le rotture.</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <NavButton targetTab="scadenze" label="Scadenze & Tagliandi" icon={ClockIcon} />
                    <NavButton targetTab="guasti" label="Officina / Guasti" icon={WrenchScrewdriverIcon} count={guastiAttivi.length} />
                    <NavButton targetTab="resi" label="Gestione Resi" icon={ArrowPathIcon} count={riconsegneRichieste.length} />
                </div>
            </div>

            {/* TOAST MESSAGGI */}
            {message && (
                <div className={`p-4 rounded-xl text-center font-bold text-sm shadow-sm animate-fade-in ${message.includes('Errore') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                    {message}
                </div>
            )}

            {/* RENDER DEL CONTENUTO DEI TAB */}
            {activeTab === 'scadenze' && (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 animate-fade-in overflow-hidden">
                    <GestioneManutenzioniView
                        scadenze={scadenze_mezzi}
                        attrezzature={attrezzature}
                        onAddScadenza={addScadenza}
                        onCompletaScadenza={completaManutenzione}
                        onDeleteScadenza={deleteScadenza}
                        isLoading={isLoading}
                    />
                </div>
            )}

            {activeTab === 'guasti' && (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 animate-fade-in overflow-hidden p-6">
                    <GestioneGuastiView 
                        guasti={guastiAttivi} 
                        articoliInRiparazione={itemsInRiparazione}
                        accettaSegnalazione={accettaSegnalazione}
                        risolviRiparazione={risolviRiparazione}
                        annullaSegnalazione={annullaSegnalazione}
                        dismettiArticolo={dismettiArticolo}
                        onActionComplete={handleActionComplete}
                        // Non serve onBack perché navighiamo coi Tab
                    />
                </div>
            )}

            {activeTab === 'resi' && (
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 animate-fade-in overflow-hidden p-6">
                    <GestioneRiconsegneView 
                        riconsegne={riconsegneRichieste} 
                        accettaRestituzione={accettaRestituzione} 
                        rifiutaRestituzione={rifiutaRestituzione} 
                        onActionComplete={handleActionComplete} 
                        // Non serve onBack
                    />
                </div>
            )}

        </div>
    );
};