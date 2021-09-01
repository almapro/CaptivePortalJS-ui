import { HashRouter, Switch } from 'react-router-dom';
import { DashboardView, LoginView } from './views';
import { createContext, useEffect, useState } from 'react';
import { Driver } from 'neo4j-driver';
import { AuthRoute, RestrictedRoute } from './components';
import { ThemeProvider } from '@emotion/react';
import { createTheme, CssBaseline } from '@material-ui/core';

export type AppContext = {
  darkMode: boolean
  toggleDarkMode: () => void
  connected: boolean
  setConnected: (connected: boolean) => void
  driver: Driver | null,
  setDriver: (driver: Driver) => void
}

export const appContext = createContext<AppContext>({
  darkMode: false,
  toggleDarkMode: () => {},
  connected: false,
  setConnected: () => {},
  driver: null,
  setDriver: () => {},
});

const App = () => {
  const localDarkMode = localStorage.getItem('darkMode');
  const [darkMode, setDarkMode] = useState(localDarkMode && localDarkMode === '1' ? true : false);
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const [connected, setConnected] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [theme, setTheme] = useState(createTheme());
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode ? '1' : '');
    setTheme(createTheme({
      palette: {
        mode: darkMode ? 'dark' : 'light',
      }
    }));
  }, [darkMode]);
  const appContextValue: AppContext = {
    darkMode,
    toggleDarkMode,
    connected,
    setConnected,
    driver,
    setDriver,
  }
  return (
    <appContext.Provider value={appContextValue}>
    <ThemeProvider theme={theme}>
      <CssBaseline>
      <HashRouter basename='/'>
        <Switch>
          <RestrictedRoute path='/' exact>
             <DashboardView />
          </RestrictedRoute>
          <AuthRoute path='/login' exact>
            <LoginView />
          </AuthRoute>
        </Switch>
      </HashRouter>
      </CssBaseline>
      </ThemeProvider>
    </appContext.Provider>
  );
}

export default App;
