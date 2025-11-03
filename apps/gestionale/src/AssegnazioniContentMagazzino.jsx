import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeCustomizer.jsx';
import { AssegnaAttrezzaturaForm } from 'shared-ui'; // Assumendo che questo form sia ora in shared-ui
import AssegnazioniMenuMagazzino from './components/AssegnazioniMenuMagazzino.jsx';
import GestioneAssegnazioniMagazzinoView from './components/GestioneAssegnazioniMagazzinoView.jsx';
import GestioneGuastiView from './components/GestioneGuastiView.jsx';


const AssegnazioniContentMagazzino = ({
    onBack,
    onSaveSuccess,
    articoli,
    users,
    assignedItems,
    handleAssegnazione,
    handleRestituzione,
    handleUpdateAssegnazioneStatus,
    handleEliminazione,
    handleRisolviSegnalazione,
    loading,
    message,
    setMessage,
}) => {
    const { primaryColor, colorClasses } = useTheme();

    const [localView, setLocalView] = useState('menu');

    useEffect(() => {
        setLocalView('menu');
    }, []);

    const renderView = () => {
        switch (localView) {
            case 'menu':
                return <AssegnazioniMenuMagazzino
                    setLocalView={setLocalView}
                    onBack={onBack}
                    primaryColor={primaryColor}
                    colorClasses={colorClasses}
                    message={message}
                />;
            case 'add':
                return <AssegnaAttrezzaturaForm
                    onBack={() => setLocalView('menu')}
                    onSaveSuccess={onSaveSuccess}
                    dipendenti={Object.values(users)}
                    magazzino={articoli} // Passa gli articoli come prop 'magazzino'
                    handleAssegnazione={handleAssegnazione}
                    loading={loading}
                    message={message}
                    setMessage={setMessage}
                />;
            case 'manage':
                return <GestioneAssegnazioniMagazzinoView
                    assignedItemsList={assignedItems}
                    users={users}
                    magazzino={articoli} // Passa gli articoli anche qui
                    handleRestituzione={handleRestituzione}
                    handleUpdateAssegnazioneStatus={handleUpdateAssegnazioneStatus}
                    handleEliminazione={handleEliminazione}
                    loading={loading.assegnazioni}
                    message={message}
                    setLocalView={setLocalView}
                />;
            case 'gestioneGuasti':
                return <GestioneGuastiView
                    assignedItemsList={assignedItems}
                    users={users}
                    handleRisolviSegnalazione={handleRisolviSegnalazione}
                    loading={loading.assegnazioni}
                    message={message}
                    setLocalView={setLocalView}
                    primaryColor={primaryColor}
                    colorClasses={colorClasses}
                />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-2xl shadow-xl">
            {renderView()}
        </div>
    );
};

export default AssegnazioniContentMagazzino;