import { Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material"
import { makeStyles } from "@mui/styles"
import { Neo4jError, Session } from "neo4j-driver"
import { useSnackbar } from "notistack"
import { ChangeEvent, FC, FormEvent, useContext, useEffect, useState } from "react"
import { v4 } from "uuid"
import _ from 'lodash';
import { appContext } from "../App"

export type AddClientToProps = {
	show: boolean
	close: () => void
	toBeAddedToId: string
	onDone: () => void
	addToRouter?: boolean
}

export const AddClientTo: FC<AddClientToProps> = ({ show, close, onDone, toBeAddedToId, addToRouter }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { darkMode, driver, database, theme } = useContext(appContext);
	const useStyles = makeStyles({
		input: {
			color: 'inherit',
			marginTop: '10px !important',
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
	const [ip, setIp] = useState('');
	const [mac, setMac] = useState('');
	const [ipError, setIpError] = useState(false);
	const handleIpChange = (e: ChangeEvent<HTMLInputElement>) => {
		setIpError(!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(e.target.value));
		setIp(e.target.value);
	}
	const [macError, setMacError] = useState(false);
	const handleMacChange = (e: ChangeEvent<HTMLInputElement>) => {
		setMacError(!/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(e.target.value));
		setMac(e.target.value);
	}
	const addClientTo = async (session: Session) => {
		const cid = v4();
		const txr = session.beginTransaction();
		await txr.run(`CREATE (c:Client { id: $cid${ mac && ', mac: $mac' }${ ip && ', ip: $ip' } })`, _.assign({ cid }, mac ? { mac } : {}, ip ? { ip } : {}));
		await txr.run(`MATCH (t { id: $toBeAddedToId }), (c { id: $cid }) CREATE (c)-[:CONNECTS_TO]->(t)`, { toBeAddedToId, cid });
		await txr.commit();
		await session.close();
	}
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			try {
				await addClientTo(driver.session({ database }));
				enqueueSnackbar('Client has been added successfully', { variant: 'success' });
				onDone();
				close();
			} catch(e) {
				enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
			}
		}
	}
	useEffect(() => {
		return () => {
			setIpError(false);
			setMacError(false);
			setIp('');
			setMac('');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show]);
	if (!show) return null;
	return (
		<Dialog open={show} fullWidth maxWidth='lg'>
			<form onSubmit={handleOnSubmit}>
				<DialogTitle>Add client to {addToRouter ? 'router' : 'wifi' }</DialogTitle>
				<DialogContent>
					<Grid container spacing={0}>
						{addToRouter && <TextField className={classes.input} required={addToRouter} label='IP' error={ipError} helperText={ipError ? 'IP address must be formatted properly' : ''} value={ip} onChange={handleIpChange} />}
						<TextField className={classes.input} required label='MAC' placeholder='xx:xx:xx:xx:xx:xx' error={macError} helperText={macError ? 'MAC address must be formatted properly' : ''} value={mac} onChange={handleMacChange} />
					</Grid>
				</DialogContent>
				<DialogActions style={{ padding: theme.spacing(3) }}>
					<Button color='inherit' onClick={close}>Cancel</Button>
					<Button variant='contained' color='primary' disabled={mac === '' && ip === ''} type='submit'>Add</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}
