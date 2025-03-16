import {resolve} from 'path';

import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import postcssPresetEnv from 'postcss-preset-env';

// https://vite.dev/config/
export default defineConfig({
    root: 'examples',
    publicDir: resolve(__dirname, 'public'),
    resolve: {
        alias: {
            '@react-live2d': resolve(__dirname, 'src/lib'),
            '@cubism': resolve(__dirname, 'CubismWebFramework/src'),
        },
    },
    plugins: [react()],
    build: {
        outDir: '../dist-examples',
        emptyOutDir: true,
    },
    css: {
        modules: {
            localsConvention: 'camelCase',
        },
        postcss: {
            plugins: [postcssPresetEnv({})],
        },
    },
});
