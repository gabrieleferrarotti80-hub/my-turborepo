import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';

export const useBackupManager = (db) => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [progress, setProgress] = useState('');

    // Elenco di tutte le collezioni da salvare
    const COLLEZIONI_DA_SALVARE = [
        'users', 'companies', 'clients', 
        'cantieri', 'subcantieri', 'programmazione', 
        'fornitori', 'preventivi_fornitori', 'ordini_acquisto', 'ddt_acquisti', 'fatture_acquisto',
        'offerte', 'fatture', 
        'attrezzature', 'magazzino', 'movimenti_magazzino',
        'presenze', 'reportTecnico'
    ];

    const eseguiBackupCompleto = async () => {
        setIsBackingUp(true);
        setProgress('Inizio scansione dati...');
        
        const backupData = {
            meta: {
                dataBackup: new Date().toISOString(),
                versione: '1.0',
                tipo: 'completo'
            },
            data: {}
        };

        try {
            for (const colName of COLLEZIONI_DA_SALVARE) {
                setProgress(`Scaricamento collezione: ${colName}...`);
                
                const colRef = collection(db, colName);
                const snapshot = await getDocs(colRef);
                
                const documenti = snapshot.docs.map(doc => {
                    const d = doc.data();
                    // Converti i Timestamp di Firestore in stringhe ISO per il JSON
                    const sanitized = Object.entries(d).reduce((acc, [key, value]) => {
                        if (value && typeof value === 'object' && value.toDate) {
                            acc[key] = value.toDate().toISOString(); // Timestamp -> Stringa
                        } else {
                            acc[key] = value;
                        }
                        return acc;
                    }, {});
                    
                    return { _id: doc.id, ...sanitized };
                });

                backupData.data[colName] = documenti;
            }

            setProgress('Generazione file JSON...');
            
            // Crea il Blob e scarica
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `BACKUP_GESTIONALE_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setProgress('Backup completato con successo!');
        } catch (error) {
            console.error("Errore Backup:", error);
            setProgress(`Errore: ${error.message}`);
        } finally {
            setIsBackingUp(false);
        }
    };

    return {
        isBackingUp,
        progress,
        eseguiBackupCompleto
    };
};