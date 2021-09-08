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
  createDatabaseIndexes: (session: Session) => Promise<void>,
  dropDatabaseIndexes: (session: Session) => Promise<void>,
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
  createDatabaseIndexes: async () => {},
  dropDatabaseIndexes: async () => {},
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
    createDatabaseIndexes: async (session: Session) => {
      const txc = session.beginTransaction();
      await txc.run('CREATE INDEX router_ip IF NOT EXISTS FOR (n:Router) ON (n.ip)');
      await txc.run('CREATE INDEX router_mac IF NOT EXISTS FOR (n:Router) ON (n.mac)');
      await txc.run('CREATE INDEX wifi_essid IF NOT EXISTS FOR (n:Wifi) ON (n.essid)');
      await txc.run('CREATE INDEX wifi_bssid IF NOT EXISTS FOR (n:Wifi) ON (n.bssid)');
      await txc.run('CREATE INDEX client_ip IF NOT EXISTS FOR (n:Client) ON (n.ip)');
      await txc.run('CREATE INDEX client_mac IF NOT EXISTS FOR (n:Client) ON (n.mac)');
      await txc.run('CREATE INDEX hotspot_essid IF NOT EXISTS FOR (n:Hotspot) ON (n.essid)');
      await txc.run('CREATE INDEX hotspot_bssid IF NOT EXISTS FOR (n:Hotspot) ON (n.bssid)');
      await txc.run('CREATE INDEX network_subnet IF NOT EXISTS FOR (n:Network) ON (n.subnet)');
      await txc.run('CREATE INDEX network_gateway IF NOT EXISTS FOR (n:Network) ON (n.gateway)');
      await txc.run('CREATE INDEX service_port IF NOT EXISTS FOR (n:Service) ON (n.port)');
      await txc.run('CREATE INDEX service_protocol IF NOT EXISTS FOR (n:Service) ON (n.protocol)');
      await txc.commit();
      await session.close();
    },
    dropDatabaseIndexes: async (session: Session) => {
      const txc = session.beginTransaction();
      await txc.run('DROP INDEX router_ip IF EXISTS');
      await txc.run('DROP INDEX router_mac IF EXISTS');
      await txc.run('DROP INDEX wifi_essid IF EXISTS');
      await txc.run('DROP INDEX wifi_bssid IF EXISTS');
      await txc.run('DROP INDEX client_ip IF EXISTS');
      await txc.run('DROP INDEX client_mac IF EXISTS');
      await txc.run('DROP INDEX hotspot_essid IF EXISTS');
      await txc.run('DROP INDEX hotspot_bssid IF EXISTS');
      await txc.run('DROP INDEX network_subnet IF EXISTS');
      await txc.run('DROP INDEX network_gateway IF EXISTS');
      await txc.run('DROP INDEX service_port IF EXISTS');
      await txc.run('DROP INDEX service_protocol IF EXISTS');
      await txc.commit();
      await session.close();
    },
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
