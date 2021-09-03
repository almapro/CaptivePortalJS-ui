import {
	Grid,
	FormControl,
	OutlinedInput,
	InputLabel,
	InputAdornment,
	Button,
	Paper,
	useTheme,
	IconButton,
	AlertTitle,
	Alert,
	Collapse,
	CircularProgress,
} from '@material-ui/core';
import {
	WbSunny as WbSunnyIcon,
	Bedtime as BedtimeIcon,
		VisibilityOff as VisibilityOffIcon,
		Visibility as VisibilityIcon,
} from '@material-ui/icons';
import { DefaultTheme, makeStyles } from '@material-ui/styles';
import { auth, driver, Neo4jError } from 'neo4j-driver';
import { useContext, useEffect, useState } from 'react';
import { useTitle } from 'react-use';
import { appContext } from '../App';

const useStyles = makeStyles<DefaultTheme, { mode: 'dark' | 'light' }>({
	input: {
		color: ({ mode }) => mode === 'dark' ? '#fff !important' : '#000 !important'
	}
});

export const LoginView = () => {
	useTitle('Login - Captive Portal JS');
	const { darkMode, toggleDarkMode, setConnected, setDriver, setSession } = useContext(appContext);
	const [localUrl, localUsername, localPassword, localDatabase] = [localStorage.getItem('neo4j_url'), localStorage.getItem('neo4j_username'), localStorage.getItem('neo4j_password'), localStorage.getItem('neo4j_database')]
	const [url, setUrl] = useState(!!localUrl ? localUrl : 'neo4j://localhost:7687');
	const [username, setUsername] = useState(!!localUsername ? localUsername : 'neo4j');
	const [password, setPassword] = useState(!!localPassword ? localPassword : '');
	const [database, setDatabase] = useState(!!localDatabase ? localDatabase : 'neo4j');
	const [error, setError] = useState('');
	useEffect(() => {
		localStorage.setItem('neo4j_url', url);
		localStorage.setItem('neo4j_username', username);
		localStorage.setItem('neo4j_password', password);
		localStorage.setItem('neo4j_database', database);
	}, [url, username, password, database]);
	const [showPassword, setShowPassword] = useState(false);
	const theme = useTheme();
	const darkClasses = useStyles({ mode: 'dark' });
	const lightClasses = useStyles({ mode: 'light' });
	const [classes, setClasses] = useState(darkMode ? darkClasses : lightClasses);
	const [loading, setLoading] = useState(false);
	useEffect(() => {
		setClasses(darkMode ? darkClasses : lightClasses);
	}, [darkMode, darkClasses, lightClasses]);
	const handleOnSubmit: React.FormEventHandler = async e => {
		e.preventDefault();
		setLoading(true);
		try {
			const drv = driver(url, auth.basic(username, password));
			await drv.verifyConnectivity({ database });
			const session = drv.session({ database });
			setDriver(drv);
			setSession(session);
			setLoading(false);
			setConnected(true);
		} catch (err: any) {
			const typedError: Neo4jError = err || new Neo4jError('Invalid credentials', '403');
			setError(typedError.message);
			setLoading(false);
			setTimeout(() => setError(''), 5000);
		}
	}
	const [autologin, setAutologin] = useState(true);
	useEffect(() => {
		if (autologin) {
			const e: any = { preventDefault: () => {} };
			handleOnSubmit(e);
            setAutologin(false);
		}
	}, [handleOnSubmit, autologin, setAutologin]);
	return (
		<Grid
			container
			spacing={0}
			direction='column'
			alignItems='center'
			justifyContent='center'
			style={{ minHeight: '100vh' }}>
			<Paper style={{ padding: theme.spacing(3), maxWidth: 700 }} elevation={3}>
				<form onSubmit={handleOnSubmit}>
					<Grid container spacing={3}>
						<Grid container item xs={12} alignItems='center' direction='column' justifyContent='center'>
							<IconButton
								color='inherit'
								edge='end'
								onClick={() => toggleDarkMode()}>
								{
											!darkMode ?
										<WbSunnyIcon /> :
										<BedtimeIcon />
								}
							</IconButton>
						</Grid>
						<Grid item xs={12}>
							<Collapse in={!!error}>
								<Alert severity="error">
									<AlertTitle>Error</AlertTitle>
									{error}
								</Alert>
							</Collapse>
						</Grid>
						<Grid item xs={12}>
							<FormControl required fullWidth variant="outlined">
								<InputLabel htmlFor="url">Neo4j URL</InputLabel>
								<OutlinedInput
									inputProps={{ className: classes.input }}
									value={url}
									id="url"
									label="Neo4j URL"
									onChange={e => setUrl(e.target.value)}
								/>
							</FormControl>
						</Grid>
						<Grid container item xs={12} spacing={3}>
							<Grid item xs={6}>
								<FormControl required fullWidth variant="outlined">
									<InputLabel htmlFor="username">Username</InputLabel>
									<OutlinedInput
										inputProps={{ className: classes.input }}
										value={username}
										id="username"
										label="Username"
										onChange={e => setUsername(e.target.value)}
									/>
								</FormControl>
							</Grid>
							<Grid item xs={6}>
								<FormControl required fullWidth variant="outlined">
									<InputLabel htmlFor="password">Password</InputLabel>
									<OutlinedInput
										inputProps={{ className: classes.input }}
										value={password}
										id="password"
										type={showPassword ? 'text' : 'password'}
										onChange={e => setPassword(e.target.value)}
										endAdornment={
											<InputAdornment position="end">
												<IconButton
													aria-label="toggle password visibility"
													onClick={() => setShowPassword(!showPassword)}
													edge="end">
													{showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
												</IconButton>
											</InputAdornment>
										}
										label="Password"
									/>
								</FormControl>
							</Grid>
						</Grid>
						<Grid item xs={12}>
							<FormControl required fullWidth variant="outlined">
								<InputLabel htmlFor="database">Database</InputLabel>
								<OutlinedInput
									inputProps={{ className: classes.input }}
									value={database}
									id="database"
									label="Database"
									onChange={e => setDatabase(e.target.value)}
								/>
							</FormControl>
						</Grid>
						<Grid item xs={12}>
							<Button disabled={loading} fullWidth type='submit' variant='contained'>{loading ? <CircularProgress /> : 'Login' }</Button>
						</Grid>
					</Grid>
				</form>
			</Paper>
		</Grid>
	)
}
