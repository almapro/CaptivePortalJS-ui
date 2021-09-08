import { HashRouter, Switch } from 'react-router-dom';
import { DashboardView, LoginView } from './views';
import { createContext, useEffect, useState } from 'react';
import { Driver, Session } from 'neo4j-driver';
import { AuthRoute, RestrictedRoute } from './components';
import { ThemeProvider } from '@emotion/react';
import { createTheme, CssBaseline, Theme } from '@material-ui/core';
import Sigma from 'sigma';

export type AppContext = {
  darkMode: boolean
  toggleDarkMode: () => void
  connected: boolean
  setConnected: (connected: boolean) => void
  driver: Driver | null
  setDriver: (driver: Driver | null) => void
  database: string,
  setDatabase: (database: string) => void,
  sigma: Sigma | null
  setSigma: (sigma: Sigma | null) => void
  theme: Theme,
  autologin: boolean,
  setAutologin: (autoLogin: boolean) => void,
}

export const appContext = createContext<AppContext>({
  darkMode: false,
  toggleDarkMode: () => {},
  connected: false,
  setConnected: () => {},
  driver: null,
  setDriver: () => {},
  database: '',
  setDatabase: () => {},
  sigma: null,
  setSigma: () => {},
  theme: createTheme({
    palette: {
      primary: {
        main: '#85559F',
      },
      secondary: {
        main: '#3F294D',
      },
      mode: 'light',
    }
  }),
  autologin: true,
  setAutologin: () => {},
});

const App = () => {
  const localDarkMode = localStorage.getItem('darkMode');
  const [darkMode, setDarkMode] = useState(localDarkMode && localDarkMode === '1' ? true : false);
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const [connected, setConnected] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [database, setDatabase] = useState('');
  const [sigma, setSigma] = useState<Sigma | null>(null);
  const [theme, setTheme] = useState(createTheme({
    palette: {
      primary: {
        main: '#85559F',
      },
      secondary: {
        main: '#3F294D',
      },
      mode: darkMode ? 'dark' : 'light',
    }
  }));
  const [autologin, setAutologin] = useState(true);
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode ? '1' : '');
    setTheme(createTheme({
      palette: {
        primary: {
          main: '#85559F',
        },
        secondary: {
          main: '#3F294D',
        },
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
    database,
    setDatabase,
    sigma,
    setSigma,
    theme,
    autologin,
    setAutologin,
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
