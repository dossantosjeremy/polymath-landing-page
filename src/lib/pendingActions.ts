// Pending Actions - store actions to execute after authentication

export interface PendingAction {
  type: 'save_syllabus';
  payload: {
    discipline: string;
    path: string;
    modules: any[];
    source: string;
    rawSources: any[];
  };
  returnUrl: string;
  timestamp: number;
}

export const setPendingAction = (action: PendingAction): void => {
  sessionStorage.setItem('pendingAction', JSON.stringify(action));
};

export const getPendingAction = (): PendingAction | null => {
  const stored = sessionStorage.getItem('pendingAction');
  if (!stored) return null;
  
  try {
    const action = JSON.parse(stored) as PendingAction;
    // Expire after 10 minutes
    if (Date.now() - action.timestamp > 10 * 60 * 1000) {
      clearPendingAction();
      return null;
    }
    return action;
  } catch {
    return null;
  }
};

export const clearPendingAction = (): void => {
  sessionStorage.removeItem('pendingAction');
};
