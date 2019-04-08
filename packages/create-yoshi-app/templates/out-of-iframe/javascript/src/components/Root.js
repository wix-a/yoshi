import React from 'react';
import App from './app/App';
import { I18nextProvider } from 'react-i18next';
import i18n from '../config/i18n';
import { ExperimentsProvider } from '@wix/wix-experiments-react';

export default class AppRoot extends React.Component {
  render() {
    const { name, locale, experiments } = this.props;

    return (
      <I18nextProvider i18n={i18n(locale)}>
        <ExperimentsProvider options={{ experiments }}>
          <App name={name} />
        </ExperimentsProvider>
      </I18nextProvider>
    );
  }
}
