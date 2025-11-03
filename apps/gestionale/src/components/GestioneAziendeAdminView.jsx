// src/components/GestioneAziendeAdminView.jsx

import React, { useState } from 'react';
// ✅ CORREZIONE: Usa un'importazione nominata (con parentesi graffe)
import { GestioneAziendeSidebar } from 'shared-ui'; 
import { CreaAziendaView } from './CreaAziendaView.jsx';
import { GestionePermessiView } from './GestionePermessiView.jsx';

// --- MODIFICA 1: Importa la nuova vista ---
// (Ricorda che l'errore precedente ci ha detto che è un export default, quindi senza graffe)
import  {AutorizzazioniFormView} from './AutorizzazioniFormView.jsx';


export const GestioneAziendeAdminView = ({ onBack }) => {
     // Stato per gestire la navigazione interna, con 'crea-azienda' come default
     const [view, setView] = useState('crea-azienda');

     // Funzione per renderizzare il contenuto corretto a destra della sidebar
   	const renderContent = () => {
   	     switch (view) {
   	         case 'permessi':
   	         	   return <GestionePermessiView />;

   	         // --- MODIFICA 2: Aggiungi il case per la nuova vista ---
   	   	  case 'autorizzazioni_form':
   	   	  	   return <AutorizzazioniFormView />;

   	         case 'crea-azienda':
   	       	default:
   	       	   return <CreaAziendaView />;
   	     }
   	};

   	return (
   	     <div className="flex w-full h-screen">
   	     	  <GestioneAziendeSidebar 
   	     	  	  activeView={view}
   	   	  	  onNavigate={setView}
   	   	  	  onBack={onBack} // Passa la funzione per tornare alla dashboard principale
   	   	  />
   	     	  <main className="flex-1 overflow-y-auto bg-gray-100">
   	   	  	  {renderContent()}
   	   	  </main>
   	     </div>
   	);
};