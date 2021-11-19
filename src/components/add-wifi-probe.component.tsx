import { Dialog, Grid, CardContent, Card, CardActionArea, Divider, Button, DialogTitle, DialogContent, DialogActions, Tooltip, Select, MenuItem, FormControl, InputLabel, TextField } from "@mui/material";
import { makeStyles } from "@mui/styles";
import {
	List as ListIcon,
	Add as AddIcon,
} from "@mui/icons-material";
import { FC, FormEvent, useContext, useState, useEffect } from "react";
import { appContext } from "../App";
import { v4 } from "uuid";
import { Session, Neo4jError } from 'neo4j-driver';
import { useSnackbar } from "notistack"
import { useSigma } from "react-sigma-v2/lib/esm";
import { NodeType } from "../neo4j-sigma-graph";

export type AddWifiProbeProps = {
	show: boolean
	close: () => void
	onDone: () => void
	clientId: string
}

export const AddWifiProbe: FC<AddWifiProbeProps> = ({ show, close, onDone, clientId }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { theme, driver, database } = useContext(appContext);
	const sigma = useSigma();
	const graph = sigma.getGraph();
	const useStyles = makeStyles({
		cardActionArea: {
			'&:disabled > .MuiCardActionArea-focusHighlight': {
				opacity: 0.3
			}
		},
		divider: {
			width: `calc(100% - ${theme.spacing(2)})`,
			height: '10px',
			left: theme.spacing(1),
		},
	});
	const classes = useStyles();
	const [wifiType, setWifiType] = useState<'EXISTING' | 'NEW'>('EXISTING');
	const wifiTypes: [JSX.Element, string, 'EXISTING' | 'NEW', string][] = [
		[<ListIcon />, 'Existing', 'EXISTING', 'An existing wifi'],
		[<AddIcon />, 'New', 'NEW', 'A new wifi'],
	];
	const handleClose = () => {
		setWifiType('EXISTING');
		close();
	}
	const [rid, setRid] = useState('');
	const [essid, setEssid] = useState('');
	const [wifis, setWifis] = useState<any[]>([]);
	const addExistingProbe = async (session: Session) => {
		const txr = session.beginTransaction();
		const node_type: NodeType = graph.getNodeAttribute(rid, 'node_type');
		await txr.run(`MATCH (w { id: $rid }), (r { id: $clientId }) CREATE (r)-[:${node_type === 'WIFI' ? 'CONNECTS_TO' : 'KNOWS' }]->(w)`, { clientId, rid });
		await txr.commit();
		await session.close();
	}
	const addNewProbe = async (session: Session) => {
		const txr = session.beginTransaction();
		const wifiId = v4();
		await txr.run(`MATCH (r { id: $clientId }) CREATE (w:WifiProbe { id: $wifiId, essid: $essid }), (r)-[:KNOWS]->(w)`, { clientId, wifiId, essid });
		await txr.commit();
		await session.close();
	}
	useEffect(() => {
		if (driver) {
			try {
				const newWifis: any[] = [];
				const session = driver.session({ database });
				const txc = session.beginTransaction();
				txc.run(`MATCH (c { id: $clientId }), (w) WHERE (w:Wifi OR w:WifiProbe) AND NOT (c)-[:CONNECTS_TO]-(w) AND NOT (c)-[:KNOWS]-(w) RETURN w`, { clientId }).then(result => {
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
			setEssid('');
			setWifis([]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show]);
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			if (wifiType === 'EXISTING') {
				await addExistingProbe(driver.session({ database }));
				enqueueSnackbar(`An existing wifi probe to (${graph.getNodeAttribute(rid, 'label')}) added successfuly`, { variant: 'success' })
			} else {
				await addNewProbe(driver.session({ database }));
				enqueueSnackbar(`A new wifi probe (${essid}) added successfuly`, { variant: 'success' })
			}
			handleClose();
			onDone();
		}
	}
	if (!show) return null;
	return (
		<Dialog open={show} fullWidth maxWidth='lg'>
			<form onSubmit={handleOnSubmit}>
				<DialogTitle>Add a wifi probe</DialogTitle>
				<DialogContent>
					<Grid container spacing={2}>
						<Grid item container spacing={1}>
							<Grid item container xs={12} spacing={1}>
								{wifiTypes.map((node, idx) => (
									<Grid key={idx} item>
										<Tooltip title={node[3]}>
											<Card variant='outlined' sx={{ width: 75, height: 75 }}>
												<CardActionArea className={classes.cardActionArea} disabled={node[2] === wifiType} onClick={() => setWifiType(node[2])}>
													<CardContent sx={{ height: 75 }}>
														<Grid container justifyContent='center' alignItems='center' direction='column' height='100%'>
															<Grid item>{node[0]}</Grid>
															<Grid item>{node[1]}</Grid>
														</Grid>
													</CardContent>
												</CardActionArea>
											</Card>
										</Tooltip>
									</Grid>
								))}
							</Grid>
						</Grid>
						<Divider variant='middle' className={classes.divider} />
						<Grid item container spacing={1}>
							{
								wifiType === 'EXISTING' && <FormControl sx={{ width: 300, margin: theme => theme.spacing(1) }}>
									<InputLabel id='existingWifi'>Select a wifi</InputLabel>
									<Select labelId='existingWifi' value={rid} onChange={e => setRid(e.target.value)} label='Select a wifi'>
										{wifis.map(wifi => <MenuItem value={wifi.id} key={wifi.id}>{graph.getNodeAttribute(wifi.id, 'node_type') === 'WIFI' ? `${wifi.essid} - ${wifi.bssid}` : `${wifi.essid} (Probe)`}</MenuItem>)}
									</Select>
								</FormControl>
							}
							{wifiType === 'NEW' && <TextField sx={{ margin: theme => theme.spacing(1), width: 300 }} label='Essid' required value={essid} onChange={e => setEssid(e.target.value)} />}
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions style={{ padding: theme.spacing(3) }}>
					<Button color='inherit' onClick={handleClose}>Cancel</Button>
					<Button variant='contained' color='primary' disabled={(wifiType === 'EXISTING' && rid === '') || (wifiType === 'NEW' && essid === '')} type='submit'>Add</Button>
				</DialogActions>
			</form>
		</Dialog>
	)
}
