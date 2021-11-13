import { Dialog, Grid, Button, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { FC, FormEvent, useContext, useState, useEffect } from "react";
import { appContext } from "../App";
import { Session, Neo4jError } from 'neo4j-driver';
import { useSnackbar } from "notistack"
import { useSigma } from "react-sigma-v2/lib/esm";

export type RemoveWifiProbeProps = {
	show: boolean
	close: () => void
	onDone: () => void
	clientId: string
}

export const RemoveWifiProbe: FC<RemoveWifiProbeProps> = ({ show, close, onDone, clientId }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { theme, driver, database } = useContext(appContext);
	const sigma = useSigma();
	const graph = sigma.getGraph();
	const handleClose = () => {
		close();
	}
	const [rid, setRid] = useState('');
	const [wifis, setWifis] = useState<any[]>([]);
	const removeWifiProbe = async (session: Session) => {
		const txr = session.beginTransaction();
		await txr.run(`MATCH (c { id: $clientId })-[r]->({ id: $rid }) WHERE r:KNOWS OR r:CONNECTS_TO DELETE r`, { clientId, rid });
		await txr.commit();
		await session.close();
	}
	useEffect(() => {
		if (driver) {
			try {
				const newWifis: any[] = [];
				const session = driver.session({ database });
				const txc = session.beginTransaction();
				txc.run(`MATCH ({ id: $clientId })-[r]-(w) WHERE (w:Wifi OR w:WifiProbe) AND (r:CONNECTS_TO OR r:KNOWS) RETURN w`, { clientId }).then(result => {
					result.records.forEach(async record => {
						const wifi = record.toObject().w.properties;
						newWifis.push(wifi);
					});
					setWifis(newWifis);
				}).finally(() => session.close());
			} catch(e) {
				enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
			}
		}
		return () => {
			setRid('');
			setWifis([]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show]);
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			await removeWifiProbe(driver.session({ database }));
			enqueueSnackbar(`An existing wifi probe to (${graph.getNodeAttribute(rid, 'label')}) has been removed successfuly`, { variant: 'success' })
			handleClose();
			onDone();
		}
	}
	if (!show) return null;
	return (
		<Dialog open={show} fullWidth maxWidth='lg'>
			<form onSubmit={handleOnSubmit}>
				<DialogTitle>Remove a wifi probe</DialogTitle>
				<DialogContent>
					<Grid container>
						<FormControl sx={{ width: 300, margin: theme => theme.spacing(1) }}>
							<InputLabel id='existingWifi'>Select a wifi</InputLabel>
							<Select labelId='existingWifi' value={rid} onChange={e => setRid(e.target.value)} label='Select a wifi'>
								{wifis.map(wifi => <MenuItem value={wifi.id} key={wifi.id}>{graph.getNodeAttribute(wifi.id, 'node_type') === 'WIFI' ? `${wifi.essid} - ${wifi.bssid}` : `${wifi.essid} (Probe)`}</MenuItem>)}
							</Select>
						</FormControl>
					</Grid>
				</DialogContent>
				<DialogActions style={{ padding: theme.spacing(3) }}>
					<Button color='inherit' onClick={handleClose}>Cancel</Button>
					<Button variant='contained' color='primary' disabled={rid === ''} type='submit'>Remove</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}
