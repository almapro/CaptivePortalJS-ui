import { Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, FormControl, InputLabel } from "@mui/material"
import { Neo4jError, Session } from "neo4j-driver"
import { useSnackbar } from "notistack"
import { FC, FormEvent, useContext, useEffect, useState } from "react"
import { appContext } from "../App"

export type AttachWifiToRouterProps = {
	show: boolean
	close: () => void
	wifiId: string
	onDone: () => void
}

export const AttachWifiToRouter: FC<AttachWifiToRouterProps> = ({ show, close, onDone, wifiId }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { darkMode, driver, database, theme } = useContext(appContext);
	const [rid, setRid] = useState('');
	const [routers, setRouters] = useState<any[]>([]);
	const attachToRouter = async (session: Session) => {
		const txr = session.beginTransaction();
		await txr.run(`MATCH (w:Wifi { id: $wifiId }), (r { id: $rid }) CREATE (r)-[:BROADCASTS]->(w)`, { wifiId, rid });
		await txr.commit();
		await session.close();
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
			setRid('');
			setRouters([]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show]);
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			try {
				await attachToRouter(driver.session({ database }));
				enqueueSnackbar('Wifi has been attached successfully', { variant: 'success' });
				onDone();
				close();
			} catch(e) {
				enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
			}
		}
	}
	if (!show) return null;
	return (
		<Dialog open={show} fullWidth maxWidth='lg'>
			<form onSubmit={handleOnSubmit}>
				<DialogTitle>Attach wifi to a router</DialogTitle>
				<DialogContent>
					<Grid container spacing={2}>
						<Grid item container spacing={0}>
							<FormControl sx={{ m: 1, minWidth: '90%' }}>
								<InputLabel htmlFor='rid'>Router</InputLabel>
								<Select style={{ color: `#${darkMode ? 'fff' : '000'}` }} defaultValue={rid} native id='rid' onChange={e => setRid(e.target.value as string)} label='Router'>
									<option value='' />
									{routers.map(router => (
										<option key={router.id} value={router.id}>{router.ip} - {router.mac}</option>
									))}
								</Select>
							</FormControl>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions style={{ padding: theme.spacing(3) }}>
					<Button color='inherit' onClick={close}>Cancel</Button>
					<Button variant='contained' color='primary' disabled={rid === ''} type='submit'>Attach</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}
