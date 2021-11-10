import _ from 'lodash';
import { Grid, Dialog, DialogTitle, DialogContent, DialogActions, Button, Select, FormControl, InputLabel } from "@mui/material"
import { Neo4jError, Session } from "neo4j-driver"
import { useSnackbar } from "notistack"
import { FC, FormEvent, useContext, useEffect, useState } from "react"
import { appContext } from "../App"

export type AttachRouterToBuildingProps = {
	show: boolean
	close: () => void
	routerId: string
	onDone: () => void
}

export const AttachRouterToBuilding: FC<AttachRouterToBuildingProps> = ({ show, close, onDone, routerId }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { darkMode, driver, database, theme } = useContext(appContext);
	const [rid, setRid] = useState('');
	const [houses, setHouses] = useState<any[]>([]);
	const [buildings, setBuildings] = useState<{ floors: any[], [key: string]: any }[]>([]);
	const attachToBuilding = async (session: Session) => {
		const txr = session.beginTransaction();
		await txr.run(`MATCH (w:Router { id: $routerId }), (r { id: $rid }) CREATE (w)-[:ATTACHED_TO]->(r)`, { routerId, rid });
		await txr.commit();
		await session.close();
	}
	useEffect(() => {
		if (driver) {
			try {
				const newHouses: any[] = [];
				const newBuildings: { floors: any[], [key: string]: any }[] = [];
				const session = driver.session({ database });
				const txc = session.beginTransaction();
				txc.run(`MATCH (h:Building { type: 'HOUSE' }) RETURN h`).then(houses => {
					houses.records.forEach(async record => {
						const house = record.toObject().h.properties;
						newHouses.push(house);
					});
					setHouses(newHouses);
					txc.run(`MATCH r = (:Building)-[:HAS_FLOOR]-(:Floor) RETURN r`).then(buildingsHasFloors => {
						buildingsHasFloors.records.forEach(async record => {
							const relation = record.toObject().r;
							let building = relation.start.properties;
							const floor = relation.end.properties;
							if (_.find(newBuildings, { 'id': building.id })) {
								building = _.find(newBuildings, { id: building.id });
							} else building.floors = [];
							if (!_.find(building.floors, floor)) building.floors.push(floor);
							if (!_.find(newBuildings, { 'id': building.id })) newBuildings.push(building);
						});
						setBuildings(newBuildings);
					}).finally(() => session.close());
				});
			} catch(e) {
				enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			try {
				await attachToBuilding(driver.session({ database }));
				setRid('');
				enqueueSnackbar('Router has been attached successfully', { variant: 'success' });
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
				<DialogTitle>Attach router to a building</DialogTitle>
				<DialogContent>
					<Grid container spacing={2}>
						<Grid item container spacing={0}>
							<FormControl sx={{ m: 1, minWidth: '90%' }}>
								<InputLabel htmlFor='rid'>Building</InputLabel>
								<Select style={{ color: `#${darkMode ? 'fff' : '000'}` }} defaultValue={rid} native id='rid' onChange={e => setRid(e.target.value as string)} label='Building'>
									<option value='' />
									{buildings.map(building => (
										<optgroup label={building.name} key={building.id}>
										{building.floors.map(floor => (
											<option value={floor.id} key={floor.id}>Floor {floor.number.low}</option>
										))}
										</optgroup>
									))}
									{houses.map(house => (
										<option key={house.id} value={house.id}>{house.name}</option>
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
