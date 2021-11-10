import _ from 'lodash';
import { Grid, Typography, TextField } from "@mui/material"
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

export const AddWifiNode: FC<AddWifiNodeProps> = ({ onDone, eventEmitter }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { darkMode, driver, database } = useContext(appContext);
	const [essid, setEssid] = useState('');
	const [bssid, setBssid] = useState('');
	const [password, setPassword] = useState('');
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
	const createWifi = async (session: Session, essid: string, bssid: string, password: string) => {
		const id = v4();
		const txr = session.beginTransaction();
		await txr.run(`CREATE (n:Wifi { id: $id, essid: $essid, bssid: $bssid${password !== '' ? ', password: $password' : ''} })`, _.assign({}, { id, essid, bssid }, password !== '' ? { password } : {}));
		await txr.commit();
		await session.close();
	}
	useEffect(() => {
		eventEmitter.on('ADD_WIFI_NODE', () => {
			if (driver) {
				createWifi(driver.session({ database }), essid, bssid, password)
					.then(() => { enqueueSnackbar('Wifi node added successfuly', { variant: 'success' }); })
					.catch(err => { enqueueSnackbar((err as Neo4jError).message, { variant: 'error' }); })
					.finally(() => onDone());
			}
		});
		return () => {
			eventEmitter.removeAllListeners('ADD_WIFI_NODE');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [essid, bssid, password]);
	return (
		<>
			<Grid item xs={12}>
				<Typography variant='caption'>Wifi</Typography>
			</Grid>
			<Grid item xs={12} container>
				<TextField required label='ESSID' className={classes.input} value={essid} onChange={e => setEssid(e.target.value)} />
				<TextField required label='BSSID' placeholder='xx:xx:xx:xx:xx:xx' className={classes.input} error={bssidError} helperText={bssidError ? 'BSSID must be formatted properly' : ''} value={bssid} onChange={handleBssidChange} />
				<TextField label='Password (optional)' className={classes.input} value={password} onChange={e => setPassword(e.target.value)} />
			</Grid>
		</>
	)
}
