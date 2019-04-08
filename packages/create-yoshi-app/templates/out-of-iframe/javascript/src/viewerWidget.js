import Root from './components/Root';
import { withStyles } from '@wix/native-components-infra';

export default {
  component: withStyles(Root, {
    cssPath: ['editorExampleWidget.stylable.bundle.css'],
  }),
};

// This file must export a default export object with "component" key
