import React from 'react';
import {createRoot} from 'react-dom/client';
import WorkflowOptions from './WorkflowOptions';
import './style.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode><WorkflowOptions/></React.StrictMode>);
