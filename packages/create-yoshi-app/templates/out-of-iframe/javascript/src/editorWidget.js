import React from 'react';
import ReactDOM from 'react-dom';
import AppRoot from './components/Root';
import { ViewerScriptWrapper, withStyles } from '@wix/native-components-infra';
import viewerScript from './viewerScript';

const WrappedExampleWidget = ViewerScriptWrapper(
  withStyles(AppRoot, {
    cssPath: ['editorExampleWidget.stylable.bundle.css'],
  }),
  {
    viewerScript,
    Wix: window.Wix,
    widgetConfig: {},
    overrides: {
      platform: {
        baseUrls: {
          staticsBaseUrl: window.__STATICS_BASE_URL__,
        },
      },
    },
  },
);

ReactDOM.render(<WrappedExampleWidget />, document.getElementById('root'));
