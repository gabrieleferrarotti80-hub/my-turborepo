import React, { useState } from 'react';
import { useFirebaseData, useFatturazioneManager } from 'shared-core';
import { FatturazioneDashboard, FatturaForm } from 'shared-ui'; 

export const FatturazioneContent = ({ onNavigateBack }) => {
    
    const { db, user, companyID, data, loadingData } = useFirebaseData();
    const currentCompany = (data.companies || []).find(c => c.id === companyID);
    
    const { 
        isLoading: isManagerLoading, 
        createFattura, 
        updateFattura,    
        updateStatoFattura,
        deleteFattura     
    } = useFatturazioneManager(db, user, companyID);

    const [view, setView] = useState('list'); 
    const [selectedFattura, setSelectedFattura] = useState(null);
    
    const handleBack = () => {
        setView('list');
        setSelectedFattura(null);
    };

    // 🌟 MOTORE DI CALCOLO PROGRESSIVO (Spostato qui per renderlo universale!)
    const generaProssimoNumeroFattura = (dataEmissione) => {
        // Cerca l'anno della fattura che stiamo creando, oppure l'anno corrente
        const annoCorrente = new Date(dataEmissione || new Date()).getFullYear();
        const fatture = data.fatture || [];
        
        const fattureAnno = fatture.filter(f => {
            if (!f.dataEmissione || !f.numeroFattura) return false;
            return new Date(f.dataEmissione).getFullYear() === annoCorrente;
        });

        if (fattureAnno.length === 0) return "1"; 

        let maxNum = 0;
        fattureAnno.forEach(f => {
            const match = String(f.numeroFattura).match(/\d+/);
            if (match) {
                const num = parseInt(match[0], 10);
                if (num > maxNum) maxNum = num;
            }
        });

        return String(maxNum + 1);
    };

    // 🌟 DOGANA DI SALVATAGGIO INFALLIBILE
    const handleSaveFattura = async (datiFattura) => {
        const statoFattura = (datiFattura.stato || '').toLowerCase().trim();
        const numeroAttuale = String(datiFattura.numeroFattura || '').trim();

        // Se la fattura NON è una bozza, e il numero è vuoto...
        if (statoFattura !== 'bozza' && (!numeroAttuale || numeroAttuale === 'undefined' || numeroAttuale === 'null')) {
            console.log("⚙️ Assegnazione automatica numero fattura in corso...");
            datiFattura.numeroFattura = generaProssimoNumeroFattura(datiFattura.dataEmissione);
        }

        if (selectedFattura && selectedFattura.id) {
            return await updateFattura(selectedFattura.id, datiFattura);
        } else {
            return await createFattura(datiFattura);
        }
    };

    const handleDeleteFattura = async (fatturaId) => {
        if (confirm("Sei sicuro di voler eliminare questa fattura?")) {
            const res = await deleteFattura(fatturaId);
            if (res.success) alert("Fattura eliminata.");
        }
    };

    const handleCreateFattura = (draftFattura = null) => {
        setSelectedFattura(draftFattura); 
        setView('add');
    };

    if (view === 'add' || (view === 'edit' && selectedFattura)) {
        return (
            <FatturaForm
                onBack={handleBack}
                onSave={handleSaveFattura} // <-- Passa per la nostra Dogana
                onSaveSuccess={(msg) => { 
                    alert(msg); 
                    handleBack(); 
                }}
                isLoading={isManagerLoading}
                initialData={selectedFattura}
                clients={data.clients || []}
                cantieri={data.cantieri || []}
                fatture={data.fatture || []} 
                offerte={data.offerte || []} 
                userCompany={currentCompany}
            />
        );
    }
    
    return (
        <FatturazioneDashboard
            fatture={data.fatture || []}
            clienti={data.clients || []} 
            cantieriDaFatturare={(data.cantieri || []).filter(c => c.stato === 'completato' || c.stato === 'da_fatturare')}
            onNavigateBack={onNavigateBack}
            onUpdateStato={updateStatoFattura}
            onDeleteFattura={handleDeleteFattura} 
            onCreateFattura={handleCreateFattura}
            onEditFattura={(fattura) => {
                setSelectedFattura(fattura);
                setView('edit'); 
            }}
            isLoading={loadingData || isManagerLoading}
            userCompany={currentCompany} 
        />
    );
};