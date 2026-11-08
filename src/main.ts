// Self-hosted fonts (Latin subset only): no third-party requests, works offline.
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import '@fontsource/jetbrains-mono/latin-700.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/hero.css';
import './styles/globe.css';
import './styles/motion.css';

import { startApp } from './app';

// main.ts doesn't accept HMR, so edits to TS trigger a full reload (CSS still hot-swaps).
startApp();
