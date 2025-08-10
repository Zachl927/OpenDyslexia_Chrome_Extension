import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import './popup.css';

const el = document.getElementById('root')!;
createRoot(el).render(<Popup />);
