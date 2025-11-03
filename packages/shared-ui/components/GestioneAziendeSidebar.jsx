import React from 'react';
import { useTheme } from '../context/themeContext.jsx';
import { 
    ShieldCheckIcon, 
    ArrowLeftIcon,
    BuildingOffice2Icon,
    DocumentCheckIcon
} from '@heroicons/react/24/solid';

export const GestioneAziendeSidebar = ({ activeView, onNavigate, onBack }) => {
     const theme = useTheme();

     if (!theme?.colorClasses) return null;

     const activeClass = `${theme.colorClasses[theme.primaryColor].bg} text-white`;
   	const inactiveClass = `text-gray-300 hover:bg-gray-700 hover:text-white`;

   	const menuItems = [
   	   { key: 'crea-azienda', label: 'Crea Nuova Azienda', icon: BuildingOffice2Icon },
   	   { key: 'permessi', label: 'Gestione Permessi', icon: ShieldCheckIcon },
   	   { key: 'autorizzazioni_form', label: 'Autorizzazioni Form', icon: DocumentCheckIcon }
   	];

   	return (
   	   // MODIFICA 1: Larghezza 'w-72' (come la sidebar funzionante)
   	   <aside className="w-72 bg-gray-800 p-4 text-white flex flex-col shrink-0">
   	   	  <div className="mb-8 text-center">
   	   	  	  <h1 className="text-xl font-bold">Gestione Admin</h1>
   	   	  	  <p className="text-sm text-gray-400">Pannello Proprietario</p>
   	   	  </div>
   	   	  
   	   	  <button
   	   	  	  onClick={onBack}
   	   	  	  className="flex items-center w-full p-3 my-1 rounded-md text-gray-300 hover:bg-gray-700 transition-colors duration-200 mb-8"
   	   	  >
   	   	  	  <ArrowLeftIcon className="h-5 w-5 mr-3" />
   	   	  	  <span>Torna alla Dashboard</span>
   	   	  </button>
   	   	  
   	   	  <nav className="flex-grow space-y-2">
   	   	  	  {menuItems.map((item) => (
   	   	  	  	  <button
   	   	  	  	  	key={item.key}
   	   	  	  	  	onClick={() => onNavigate(item.key)}
   	   	  	  	  	// MODIFICA 2: Aggiunto 'flex-row' per forzare la direzione
   	   	  	  	  	className={`flex flex-row items-center w-full p-3 my-1 rounded-md transition-colors duration-200 ${
 	   	  	  	  	  activeView === item.key ? activeClass : inactiveClass
   	   	  	  	  	}`}
   	   	  	  	  >
   	   	  	  	  	<item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
   	   	  	  	  	{/* MODIFICA 3: 'truncate' per gestire testo lungo */}
   	   	  	  	  	<span className="font-medium truncate">{item.label}</span>
   	   	  	  	  </button>
   	   	  	  ))}
   	   	  </nav>
   	   </aside>
   	);
};