import _ from 'lodash';
import { Grid, TextField, Select, MenuItem, FormControl, InputLabel } from "@mui/material"
import { makeStyles } from "@mui/styles"
import { Neo4jError, Session } from "neo4j-driver"
import { useSnackbar } from "notistack"
import { ChangeEvent, FC, useContext, useState, useEffect } from "react"
import { v4 } from "uuid"
import { appContext } from "../../App"
import EventEmitter from 'events';

export type AddWifiNodeProps = {
	onDone: () => void
	eventEmitter: EventEmitter
}

export type AddWifiNodeMode = 'MANUAL' | 'HASHCAT-CRACKED-RESULT';

export const AddWifiNode: FC<AddWifiNodeProps> = ({ onDone, eventEmitter }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { darkMode, driver, database } = useContext(appContext);
	const [mode, setMode] = useState<AddWifiNodeMode>('MANUAL')
	const [essid, setEssid] = useState('');
	const [bssid, setBssid] = useState('');
	const [password, setPassword] = useState('');
	const [hashcatCrackedResult, setHashcatCrackedResult] = useState('');
	const [hashcatCrackedResultError, setHashcatCrackedResultError] = useState(false);
	const handleHashcatCrackedResultChange = (e: ChangeEvent<HTMLInputElement>) => {
		setHashcatCrackedResultError(!/^[0-9A-Fa-f]{12}:[0-9A-Fa-f]{12}:[^:]+:.{8,}$/.test(e.target.value));
		setHashcatCrackedResult(e.target.value);
	}
	const useStyles = makeStyles({
		input: {
			color: 'inherit',
			marginLeft: '10px !important',
			'&:first-of-type': {
				marginLeft: '0px !important',
			},
			'& input': {
				color: darkMode ? '#fff' : '#000',
			},
		},
	});
	const classes = useStyles();
	const [bssidError, setBssidError] = useState(false);
	const handleBssidChange = (e: ChangeEvent<HTMLInputElement>) => {
		setBssidError(!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(e.target.value));
		setBssid(e.target.value);
	}
	const createWifiManualMode = async (session: Session, essid: string, bssid: string, password: string) => {
		const id = v4();
		const txr = session.beginTransaction();
		await txr.run(`CREATE (n:Wifi { id: $id, essid: $essid, bssid: $bssid${password !== '' ? ', password: $password' : ''} })`, _.assign({}, { id, essid, bssid }, password !== '' ? { password } : {}));
		await txr.commit();
		await session.close();
	}
	const createWifiHashcatCrackedResultMode = async (session: Session, result: string) => {
		const resultParts = _.split(result, ':');
		const generateBssidFromString = (bssid: string) => {
			return `${bssid.slice(0, 2)}:${bssid.slice(2, 4)}:${bssid.slice(4, 6)}:${bssid.slice(6, 8)}:${bssid.slice(8, 10)}:${bssid.slice(10)}`;
		}
		const bssid = generateBssidFromString(resultParts[0]);
		const clientMac = generateBssidFromString(resultParts[1]);
		const essid = resultParts[2];
		const password = resultParts[3];
		const id = v4();
		const clientId = v4();
		const txr = session.beginTransaction();
		await txr.run(`CREATE (n:Wifi { id: $id, essid: $essid, bssid: $bssid${password !== '' ? ', password: $password' : ''} })`, _.assign({}, { id, essid, bssid }, password !== '' ? { password } : {}));
		await txr.run(`MATCH (n:Wifi { id: $id }) CREATE (c:Client { id: $clientId, mac: $clientMac }), (c)-[:CONNECTS_TO]->(n)`, { id, clientMac, clientId });
		await txr.commit();
		await session.close();
	}
	useEffect(() => {
		eventEmitter.on('ADD_WIFI_NODE', () => {
			if (driver) {
				switch(mode) {
					case 'MANUAL':
						createWifiManualMode(driver.session({ database }), essid, bssid, password)
							.then(() => { enqueueSnackbar('Wifi node added successfuly', { variant: 'success' }); })
							.catch(err => { enqueueSnackbar((err as Neo4jError).message, { variant: 'error' }); })
							.finally(() => onDone());
						break;
					case 'HASHCAT-CRACKED-RESULT':
						createWifiHashcatCrackedResultMode(driver.session({ database }), hashcatCrackedResult)
							.then(() => { enqueueSnackbar('Wifi node added successfuly', { variant: 'success' }); })
							.catch(err => { enqueueSnackbar((err as Neo4jError).message, { variant: 'error' }); })
							.finally(() => onDone());
						break;
				}
			}
		});
		return () => {
			eventEmitter.removeAllListeners('ADD_WIFI_NODE');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [essid, bssid, password, mode, hashcatCrackedResult]);
	return (
		<>
			<Grid item xs={12} container>
				<FormControl fullWidth>
					<InputLabel id='mode-label'>Add mode</InputLabel>
					<Select label='Add mode' labelId='mode-label' value={mode} onChange={e => setMode((e.target.value as AddWifiNodeMode))}>
						<MenuItem value='MANUAL'>Manual</MenuItem>
						<MenuItem value='HASHCAT-CRACKED-RESULT'>Hashcat cracked result</MenuItem>
					</Select>
				</FormControl>
			</Grid>
			<Grid item xs={12} container>
				{mode === 'MANUAL' && <>
					<TextField required label='ESSID' className={classes.input} value={essid} onChange={e => setEssid(e.target.value)} />
					<TextField required label='BSSID' placeholder='xx:xx:xx:xx:xx:xx' className={classes.input} error={bssidError} helperText={bssidError ? 'BSSID must be formatted properly' : ''} value={bssid} onChange={handleBssidChange} />
					<TextField label='Password (optional)' className={classes.input} value={password} onChange={e => setPassword(e.target.value)} />
				</>}
				{mode === 'HASHCAT-CRACKED-RESULT' && <>
					<TextField required fullWidth label='Result' placeholder='XXXXXXXXXXXX:XXXXXXXXXXXX:ESSID:Password' className={classes.input} error={hashcatCrackedResultError} helperText={hashcatCrackedResultError ? 'Result must be formatted properly' : ''} value={hashcatCrackedResult} onChange={handleHashcatCrackedResultChange} />
				</>}
			</Grid>
		</>
	)
}
