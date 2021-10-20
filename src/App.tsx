import { HashRouter, Switch } from 'react-router-dom';
import { DashboardView, LoginView } from './views';
import { createContext, useEffect, useState } from 'react';
import { Driver, Session } from 'neo4j-driver';
import { AuthRoute, RestrictedRoute } from './components';
import { ThemeProvider } from '@emotion/react';
import { createTheme, CssBaseline, Theme } from '@mui/material';
import Sigma from 'sigma';
import { SnackbarProvider } from 'notistack';
import { SigmaContainer } from 'react-sigma-v2';
import 'react-sigma-v2/lib/react-sigma-v2.css';

export type AppContext = {
	darkMode: boolean
	toggleDarkMode: () => void
	connected: boolean
	setConnected: (connected: boolean) => void
	driver: Driver | null
	setDriver: (driver: Driver | null) => void
	database: string,
	setDatabase: (database: string) => void,
	username: string,
	setUsername: (username: string) => void,
	password: string,
	setPassword: (password: string) => void,
	url: string,
	setUrl: (url: string) => void,
	sigma: Sigma | null
	setSigma: (sigma: Sigma | null) => void
	theme: Theme,
	autologin: boolean,
	setAutologin: (autoLogin: boolean) => void,
	createDatabaseIndexesAndConstraints: (session: Session) => Promise<void>,
	dropDatabaseIndexesAndConstraints: (session: Session) => Promise<void>,
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
	username: '',
	setUsername: () => {},
	password: '',
	setPassword: () => {},
	url: '',
	setUrl: () => {},
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
	createDatabaseIndexesAndConstraints: async () => {},
	dropDatabaseIndexesAndConstraints: async () => {},
});

const App = () => {
	const localDarkMode = localStorage.getItem('darkMode');
	const [darkMode, setDarkMode] = useState(localDarkMode && localDarkMode === '1' ? true : false);
	const toggleDarkMode = () => setDarkMode(!darkMode);
	const [connected, setConnected] = useState(false);
	const [driver, setDriver] = useState<Driver | null>(null);
	const [database, setDatabase] = useState('');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [url, setUrl] = useState('');
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
		username,
		setUsername,
		password,
		setPassword,
		url,
		setUrl,
		sigma,
		setSigma,
		theme,
		autologin,
		setAutologin,
		createDatabaseIndexesAndConstraints: async (session: Session) => {
			try {
				const txc = session.beginTransaction();
				await txc.run('CREATE INDEX router_ip IF NOT EXISTS FOR (n:Router) ON (n.ip)');
				await txc.run('CREATE INDEX router_mac IF NOT EXISTS FOR (n:Router) ON (n.mac)');
				await txc.run('CREATE INDEX wifi_essid IF NOT EXISTS FOR (n:Wifi) ON (n.essid)');
				await txc.run('CREATE INDEX wifi_bssid IF NOT EXISTS FOR (n:Wifi) ON (n.bssid)');
				await txc.run('CREATE INDEX client_ip IF NOT EXISTS FOR (n:Client) ON (n.ip)');
				await txc.run('CREATE INDEX client_mac IF NOT EXISTS FOR (n:Client) ON (n.mac)');
				await txc.run('CREATE INDEX client_type IF NOT EXISTS FOR (n:Client) ON (n.type)');
				await txc.run('CREATE INDEX hotspot_essid IF NOT EXISTS FOR (n:Hotspot) ON (n.essid)');
				await txc.run('CREATE INDEX hotspot_bssid IF NOT EXISTS FOR (n:Hotspot) ON (n.bssid)');
				await txc.run('CREATE INDEX network_subnet IF NOT EXISTS FOR (n:Network) ON (n.subnet)');
				await txc.run('CREATE INDEX network_gateway IF NOT EXISTS FOR (n:Network) ON (n.gateway)');
				await txc.run('CREATE INDEX service_port IF NOT EXISTS FOR (n:Service) ON (n.port)');
				await txc.run('CREATE INDEX service_protocol IF NOT EXISTS FOR (n:Service) ON (n.protocol)');
				await txc.run('CREATE INDEX service_type IF NOT EXISTS FOR (n:Service) ON (n.type)');
				await txc.run('CREATE INDEX server_ip IF NOT EXISTS FOR (n:Server) ON (n.ip)');
				await txc.run('CREATE INDEX server_mac IF NOT EXISTS FOR (n:Server) ON (n.mac)');
				await txc.run('CREATE INDEX server_type IF NOT EXISTS FOR (n:Server) ON (n.type)');
				await txc.run('CREATE INDEX building_type IF NOT EXISTS FOR (n:Building) ON (n.type)');
				await txc.run('CREATE INDEX building_name IF NOT EXISTS FOR (n:Building) ON (n.name)');
				await txc.run('CREATE CONSTRAINT router_id IF NOT EXISTS ON (n:Router) ASSERT n.id IS UNIQUE');
				await txc.run('CREATE CONSTRAINT wifi_id IF NOT EXISTS ON (n:Wifi) ASSERT n.id IS UNIQUE');
				await txc.run('CREATE CONSTRAINT client_id IF NOT EXISTS ON (n:Client) ASSERT n.id IS UNIQUE');
				await txc.run('CREATE CONSTRAINT hotspot_id IF NOT EXISTS ON (n:Hotspot) ASSERT n.id IS UNIQUE');
				await txc.run('CREATE CONSTRAINT network_id IF NOT EXISTS ON (n:Network) ASSERT n.id IS UNIQUE');
				await txc.run('CREATE CONSTRAINT service_id IF NOT EXISTS ON (n:Service) ASSERT n.id IS UNIQUE');
				await txc.run('CREATE CONSTRAINT server_id IF NOT EXISTS ON (n:Server) ASSERT n.id IS UNIQUE');
				await txc.run('CREATE CONSTRAINT building_id IF NOT EXISTS ON (n:Building) ASSERT n.id IS UNIQUE');
				await txc.commit();
				await session.close();
			} catch(__) {}
		},
		dropDatabaseIndexesAndConstraints: async (session: Session) => {
			try {
				const txc = session.beginTransaction();
				await txc.run('DROP INDEX router_ip IF EXISTS');
				await txc.run('DROP INDEX router_mac IF EXISTS');
				await txc.run('DROP INDEX wifi_essid IF EXISTS');
				await txc.run('DROP INDEX wifi_bssid IF EXISTS');
				await txc.run('DROP INDEX client_ip IF EXISTS');
				await txc.run('DROP INDEX client_mac IF EXISTS');
				await txc.run('DROP INDEX client_type IF EXISTS');
				await txc.run('DROP INDEX hotspot_essid IF EXISTS');
				await txc.run('DROP INDEX hotspot_bssid IF EXISTS');
				await txc.run('DROP INDEX network_subnet IF EXISTS');
				await txc.run('DROP INDEX network_gateway IF EXISTS');
				await txc.run('DROP INDEX service_port IF EXISTS');
				await txc.run('DROP INDEX service_protocol IF EXISTS');
				await txc.run('DROP INDEX service_type IF EXISTS');
				await txc.run('DROP INDEX server_ip IF EXISTS');
				await txc.run('DROP INDEX server_mac IF EXISTS');
				await txc.run('DROP INDEX server_type IF EXISTS');
				await txc.run('DROP INDEX building_type IF EXISTS');
				await txc.run('DROP INDEX building_name IF EXISTS');
				await txc.run('DROP CONSTRAINT router_id IF EXISTS');
				await txc.run('DROP CONSTRAINT wifi_id IF EXISTS');
				await txc.run('DROP CONSTRAINT client_id IF EXISTS');
				await txc.run('DROP CONSTRAINT hotspot_id IF EXISTS');
				await txc.run('DROP CONSTRAINT network_id IF EXISTS');
				await txc.run('DROP CONSTRAINT service_id IF EXISTS');
				await txc.run('DROP CONSTRAINT server_id IF EXISTS');
				await txc.run('DROP CONSTRAINT building_id IF EXISTS');
				await txc.commit();
				await session.close();
			} catch(__) {}
		},
	}
	return (
		<appContext.Provider value={appContextValue}>
			<ThemeProvider theme={theme}>
				<CssBaseline>
					<SnackbarProvider maxSnack={3}>
						<HashRouter basename='/'>
							<Switch>
								<RestrictedRoute path='/' exact>
									<SigmaContainer>
										<DashboardView />
									</SigmaContainer>
								</RestrictedRoute>
								<AuthRoute path='/login' exact>
									<LoginView />
								</AuthRoute>
							</Switch>
						</HashRouter>
					</SnackbarProvider>
				</CssBaseline>
			</ThemeProvider>
		</appContext.Provider>
	);
}

export default App;
