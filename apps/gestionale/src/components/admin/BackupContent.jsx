import React from 'react';
import { useFirebaseData, useBackupManager } from 'shared-core';
import { BackupDashboard } from 'shared-ui';

export const BackupContent = ({ onNavigateBack }) => {
    const { db } = useFirebaseData();
    const { isBackingUp, progress, eseguiBackupCompleto } = useBackupManager(db);

    return (
        <BackupDashboard 
            onBackup={eseguiBackupCompleto}
            isBackingUp={isBackingUp}
            progress={progress}
            onNavigateBack={onNavigateBack}
        />
    );
};