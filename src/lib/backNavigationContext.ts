import { createContext, useContext } from 'react';

export const BackContext = createContext<() => void>(() => {});
export function useAppBack() { return useContext(BackContext); }
