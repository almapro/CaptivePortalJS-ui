import { Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material"
import { makeStyles } from "@mui/styles"
import { Neo4jError, Session } from "neo4j-driver"
import { useSnackbar } from "notistack"
import { ChangeEvent, FC, FormEvent, useContext, useEffect, useState } from "react"
import { appContext } from "../App"

export type ClientConnectToRouterProps = {
	show: boolean
	close: () => void
	clientId: string
	onDone: () => void
}

export const ClientConnectToRouter: FC<ClientConnectToRouterProps> = ({ show, close, onDone, clientId }) => {
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
	const [rid, setRid] = useState('');
	const [routers, setRouters] = useState<any[]>([]);
	const [ipError, setIpError] = useState(false);
	const handleIpChange = (e: ChangeEvent<HTMLInputElement>) => {
		setIpError(!/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(e.target.value));
		setIp(e.target.value);
	}
	const connectToRouter = async (session: Session) => {
		const txr = session.beginTransaction();
		await txr.run(`MATCH (c { id: $clientId }), (r { id: $rid }) CREATE (c)-[:CONNECTS_TO]->(r) SET c.ip = $ip`, { clientId, rid, ip });
		await txr.commit();
		await session.close();
	}
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			try {
				await connectToRouter(driver.session({ database }));
				enqueueSnackbar('Client has been added successfully', { variant: 'success' });
				onDone();
				close();
			} catch(e) {
				enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
			}
		}
	}
	useEffect(() => {
		if (driver) {
			try {
				const newRouters: any[] = [];
				const session = driver.session({ database });
				const txc = session.beginTransaction();
				txc.run(`MATCH (h:Router) RETURN h`).then(router => {
					router.records.forEach(async record => {
						const router = record.toObject().h.properties;
						newRouters.push(router);
					});
					setRouters(newRouters);
				}).finally(() => session.close());
			} catch(e) {
				enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
			}
		}
		return () => {
			setIpError(false);
			setIp('');
			setRid('');
			setRouters([]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show]);
	if (!show) return null;
	return (
		<Dialog open={show} fullWidth maxWidth='lg'>
			<form onSubmit={handleOnSubmit}>
				<DialogTitle>Connect client to a router</DialogTitle>
				<DialogContent>
					<Grid container spacing={0}>
		<FormControl required className={classes.input} sx={{ width: 300 }}>
							<InputLabel id='router-label'>Router</InputLabel>
							<Select labelId='router-label' label='Router' value={rid} onChange={e => setRid(e.target.value)}>
								{routers.map(router => (
									<MenuItem key={router.id} value={router.id}>{router.ip} - {router.mac}</MenuItem>
								))}
							</Select>
						</FormControl>
						<TextField className={classes.input} required label='IP' error={ipError} helperText={ipError ? 'IP address must be formatted properly' : ''} value={ip} onChange={handleIpChange} />
					</Grid>
				</DialogContent>
				<DialogActions style={{ padding: theme.spacing(3) }}>
					<Button color='inherit' onClick={close}>Cancel</Button>
					<Button variant='contained' color='primary' disabled={rid === '' && ip === ''} type='submit'>Connect</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}
