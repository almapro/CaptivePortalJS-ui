import _ from 'lodash';
import { Grid, Typography, TextField } from "@mui/material"
import { makeStyles } from "@mui/styles"
import { Neo4jError, Session } from "neo4j-driver"
import { useSnackbar } from "notistack"
import { ChangeEvent, createRef, FC, FormEvent, Ref, useContext, useState } from "react"
import { v4 } from "uuid"
import { appContext } from "../../App"

export type AddWifiNodeProps = {
	onDone: () => void
	formRef: Ref<HTMLFormElement>
}

export const useAddWifiNode = ({ onDone }: Omit<AddWifiNodeProps, 'formRef'>): [() => void, JSX.Element] => {
	const formRef = createRef<HTMLFormElement>();
	const callSubmit = () => {
		const form = formRef.current;
		if (form) {
			form.requestSubmit();
		}
	}
	return [callSubmit, <AddWifiNode formRef={formRef} onDone={onDone} />];
}

export const AddWifiNode: FC<AddWifiNodeProps> = ({ onDone, formRef }) => {
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
	const createWifi = async (session: Session) => {
		const id = v4();
		const txr = session.beginTransaction();
		await txr.run(`CREATE (n:Wifi { id: $id, essid: $essid, bssid: $bssid${password !== '' ? ', password: $password' : ''} })`, _.assign({}, { id, essid, bssid }, password !== '' ? { password } : {}));
		await txr.commit();
		await session.close();
	}
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			try {
				await createWifi(driver.session({ database }));
				enqueueSnackbar('Wifi node added successfuly', { variant: 'success' });
				onDone();
			} catch(e) {
				enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
			}
		}
	}
	return (
		<>
			<Grid item xs={12}>
				<Typography variant='caption'>Wifi</Typography>
			</Grid>
			<Grid item xs={12} container>
				<form ref={formRef} onSubmit={handleOnSubmit}>
					<TextField required label='ESSID' className={classes.input} value={essid} onChange={e => setEssid(e.target.value)} />
					<TextField required label='BSSID' placeholder='xx:xx:xx:xx:xx:xx' className={classes.input} error={bssidError} helperText={bssidError ? 'BSSID must be formatted properly' : ''} value={bssid} onChange={handleBssidChange} />
					<TextField label='Password (optional)' className={classes.input} value={password} onChange={e => setPassword(e.target.value)} />
				</form>
			</Grid>
		</>
	)
}
