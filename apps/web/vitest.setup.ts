import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Limpa o DOM renderizado entre os testes (RTL não faz auto-cleanup sem globals).
afterEach(() => cleanup());
