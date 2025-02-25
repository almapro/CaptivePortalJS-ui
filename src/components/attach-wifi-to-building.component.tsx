import _ from "lodash";
import {
	Grid,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Select,
	FormControl,
	InputLabel,
} from "@mui/material";
import { Neo4jError, Session } from "neo4j-driver";
import { useSnackbar } from "notistack";
import { FC, FormEvent, useContext, useEffect, useState } from "react";
import { appContext } from "../App";
import { Building, Floor } from "../neo4j-sigma-graph";

export type AttachWifiToBuildingProps = {
	show: boolean;
	close: () => void;
	wifiId: string;
	onDone: () => void;
};

export const AttachWifiToBuilding: FC<AttachWifiToBuildingProps> = ({
	show,
	close,
	onDone,
	wifiId,
}) => {
	const { enqueueSnackbar } = useSnackbar();
	const { darkMode, driver, database, theme } = useContext(appContext);
	const [rid, setRid] = useState("");
	const [houses, setHouses] = useState<any[]>([]);
	const [buildings, setBuildings] = useState<
		{ floors: any[]; [key: string]: any }[]
	>([]);
	const attachToBuilding = async (session: Session) => {
		const txr = session.beginTransaction();
		await txr.run(
			`MATCH (w:Wifi { id: $wifiId }), (r { id: $rid }) CREATE (w)-[:ATTACHED_TO]->(r)`,
			{ wifiId, rid }
		);
		await txr.commit();
		await session.close();
	};
	useEffect(() => {
		if (driver) {
			try {
				const newHouses: Building[] = [];
				const newBuildings: Building[] & { floors: Floor[] }[] = [];
				const session = driver.session({ database });
				session
					.run(`MATCH (h:Building) RETURN h`)
					.then(async (buildings) => {
						await Promise.all(
							buildings.records.map(async (record) => {
								const building: Building =
									record.toObject().h.properties;
								if (building.type === "HOUSE")
									newHouses.push(building);
								else {
									const multiFloor: Building & {
										floors: Floor[];
									} = _.assign(
										{},
										record.toObject().h.properties,
										{ floors: [] }
									);
									const floors = await session.run(
										`MATCH (:Building { id: $id })-[:HAS_FLOOR]-(f:Floor) RETURN f`,
										{ id: building.id }
									);
									floors.records.forEach((record) => {
										const floor: Floor =
											record.toObject().f.properties;
										multiFloor.floors.push(floor);
									});
									newBuildings.push(multiFloor);
								}
							})
						);
						setHouses(newHouses);
						setBuildings(newBuildings);
					})
					.finally(() => {
						session.close();
					});
			} catch (e) {
				enqueueSnackbar((e as Neo4jError).message, {
					variant: "error",
				});
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			try {
				await attachToBuilding(driver.session({ database }));
				setRid("");
				enqueueSnackbar("Wifi has been attached successfully", {
					variant: "success",
				});
				onDone();
				close();
			} catch (e) {
				enqueueSnackbar((e as Neo4jError).message, {
					variant: "error",
				});
			}
		}
	};
	if (!show) return null;
	return (
		<Dialog open={show} fullWidth maxWidth="lg">
			<form onSubmit={handleOnSubmit}>
				<DialogTitle>Attach wifi to a building</DialogTitle>
				<DialogContent>
					<Grid container spacing={2}>
						<Grid item container spacing={0}>
							<FormControl sx={{ m: 1, minWidth: "90%" }}>
								<InputLabel htmlFor="rid">Building</InputLabel>
								<Select
									style={{
										color: `#${darkMode ? "fff" : "000"}`,
									}}
									defaultValue={rid}
									native
									id="rid"
									onChange={(e) =>
										setRid(e.target.value as string)
									}
									label="Building"
								>
									<option value="" />
									{buildings.map((building) => (
										<optgroup
											label={building.name}
											key={building.id}
										>
											{building.floors.map((floor) => (
												<option
													value={floor.id}
													key={floor.id}
												>
													Floor {floor.number.low}
												</option>
											))}
										</optgroup>
									))}
									{houses.map((house) => (
										<option key={house.id} value={house.id}>
											{house.name}
										</option>
									))}
								</Select>
							</FormControl>
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions style={{ padding: theme.spacing(3) }}>
					<Button color="inherit" onClick={close}>
						Cancel
					</Button>
					<Button
						variant="contained"
						color="primary"
						disabled={rid === ""}
						type="submit"
					>
						Attach
					</Button>
				</DialogActions>
			</form>
		</Dialog>
	);
};
