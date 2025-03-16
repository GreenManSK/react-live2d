import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter, Route, Routes} from 'react-router';

import './index.css';
import {Page} from './Page';

const ExamplesList = React.lazy(() => import('./ExamplesList'));
const ModelViewer = React.lazy(() => import('./App-2'));

// eslint-disable-next-line ssr-friendly/no-dom-globals-in-module-scope
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        <Page title="Live2D Examples">
                            <ExamplesList />
                        </Page>
                    }
                />
                <Route
                    path="/model-viewer"
                    element={
                        <Page title="Live2D Model Viewer">
                            <ModelViewer />
                        </Page>
                    }
                />
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);
