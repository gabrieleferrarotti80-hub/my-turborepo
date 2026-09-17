import React, { useState, useEffect } from 'react';
import { FaseTaglioErbaForm } from './FaseTaglioErbaForm';
import { FaseTaglioPianteForm } from './FaseTaglioPianteForm';
import { FaseUrbanizzazioneForm } from './FaseUrbanizzazioneForm';

// 🌟 IMPORTIAMO FIREBASE
import { useFirebaseData } from 'shared-core';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const FasiLavoroManager = ({ tipologia, onAddFasi, canWriteData }) => {

    const { db, userAziendaId } = useFirebaseData();
    
    // 🌟 STATO PER LE VOCI MASTER
    const [vociMaster, setVociMaster] = useState([]);
    const [isLoadingMaster, setIsLoadingMaster] = useState(false);

    // 🌟 EFFETTO: Recupera le Voci Master all'apertura
    useEffect(() => {
        const fetchMasterList = async () => {
            if (!db) return;
            setIsLoadingMaster(true);
            try {
                const queryIds = ['GLOBAL_MASTER'];
                if (userAziendaId) queryIds.push(userAziendaId);

                const q = query(
                    collection(db, 'listini_aziendali'), 
                    where('companyID', 'in', queryIds),
                    where('isMaster', '==', true)
                );
                
                const snapshot = await getDocs(q);
                const dataFetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Ordina alfabeticamente
                dataFetched.sort((a, b) => (a.descrizione || '').localeCompare(b.descrizione || ''));
                setVociMaster(dataFetched);
            } catch (error) {
                console.error("Errore recupero Voci Master in FasiLavoroManager:", error);
            } finally {
                setIsLoadingMaster(false);
            }
        };

        fetchMasterList();
    }, [db, userAziendaId]);

    // Passa le props al sub-form corretto
    const renderForm = () => {
        // Mostra un piccolo caricamento mentre pesca il dizionario Master
        if (isLoadingMaster) {
            return (
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 text-center">
                    <p className="text-sm font-bold text-indigo-600 animate-pulse">Caricamento Lavorazioni Master in corso...</p>
                </div>
            );
        }

        switch (tipologia) {
            case 'Taglio Erba':
                return <FaseTaglioErbaForm 
                            onAddFasi={onAddFasi} 
                            canWriteData={canWriteData} 
                            vociMaster={vociMaster} // 🌟 PASSATO COME PROP
                        />;
            
            case 'Taglio Piante':
                return <FaseTaglioPianteForm 
                            onAddFasi={onAddFasi}
                            canWriteData={canWriteData} 
                            vociMaster={vociMaster} // 🌟 PASSATO COME PROP
                        />;

            case 'Urbanizzazione':
                return <FaseUrbanizzazioneForm 
                            onAddFasi={onAddFasi}
                            canWriteData={canWriteData} 
                            vociMaster={vociMaster} // 🌟 PASSATO COME PROP
                        />;

            case 'Edilizia':
                return <p className="p-4 text-sm text-gray-500">Form 'Edilizia' non ancora implementato.</p>;

            default:
                return (
                    <div className="p-4 bg-gray-50 rounded-lg border text-center">
                        <p className="text-sm font-medium text-gray-700">
                            Seleziona una "Tipologia Attività" dal menu in alto per iniziare ad aggiungere fasi di lavoro.
                        </p>
                    </div>
                );
        }
    };

    return <div className="w-full">{renderForm()}</div>;
};