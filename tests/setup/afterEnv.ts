import { configure } from '@testing-library/react-native';

// Hidden elements (e.g. behind a modal) should not satisfy queries by accident.
configure({ defaultIncludeHiddenElements: false });

afterEach(() => {
  delete (globalThis as { __routeParams?: unknown }).__routeParams;
});
