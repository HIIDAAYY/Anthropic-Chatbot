'use client';

import { createContext, useContext } from 'react';

export interface ActivityItem {
  id: number;
  type: string;
  payload: any;
}

export const ActivityContext = createContext<{ activity: ActivityItem[] }>({ activity: [] });

export const useActivity = () => useContext(ActivityContext);
