import { Grid, Typography, TextField, Card, CardActionArea, CardContent } from "@mui/material"
import { makeStyles } from "@mui/styles"
import neo4j, { Neo4jError, Session } from "neo4j-driver"
import { useSnackbar } from "notistack"
import { createRef, FC, FormEvent, Ref, useContext, useState } from "react"
import { v4 } from "uuid"
import { appContext } from "../../App"
import {
	Apartment as ApartmentIcon,
	Home as HomeIcon,
} from '@mui/icons-material';
import { WithHintComponent } from '../add-node.component';

export type BuildingType = 'BUILDING' | 'HOUSE';

export type AddBuildingNodeProps = {
	onDone: () => void
	formRef: Ref<HTMLFormElement>
} & WithHintComponent;

export const useAddBuildingNode = ({ onDone, setHint, defaultHint }: Omit<AddBuildingNodeProps, 'formRef'>): [() => void, JSX.Element] => {
	const formRef = createRef<HTMLFormElement>();
	const callSubmit = () => {
		const form = formRef.current;
		if (form) {
			form.requestSubmit();
		}
	}
	return [callSubmit, <AddBuildingNode formRef={formRef} onDone={onDone} setHint={setHint} defaultHint={defaultHint} />];
}

export const AddBuildingNode: FC<AddBuildingNodeProps> = ({ onDone, formRef, setHint, defaultHint }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { darkMode, driver, database } = useContext(appContext);
	const [name, setName] = useState('');
	const [floors, setFloors] = useState(1);
	const [buildingType, setBuildingType] = useState<BuildingType>('BUILDING');
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
		cardActionArea: {
			'&:disabled > .MuiCardActionArea-focusHighlight': {
				opacity: 0.3
			}
		},
	});
	const classes = useStyles();
	const createBuilding = async (session: Session) => {
		const id = v4();
		const txr = session.beginTransaction();
		await txr.run(`CREATE (n:Building { id: $id, name: $name, type: $buildingType })`, { id, name, buildingType });
		if (buildingType == 'BUILDING') {
			for (let number = 0; number < floors; ++number) {
				const fid = v4();
				await txr.run('MATCH (b:Building { id: $id }) CREATE (f:Floor { id: $fid, number: $number }), (b)-[:HAS_FLOOR]->(f)', { id, fid, number: neo4j.int(number + 1) });
			}
		}
		await txr.commit();
		await session.close();
	}
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			try {
				await createBuilding(driver.session({ database }));
				enqueueSnackbar('Building node added successfuly', { variant: 'success' });
				onDone();
			} catch(e) {
				enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
			}
		}
	}
	return (
		<>
			<Grid item xs={12}>
				<Typography variant='caption'>Building</Typography>
			</Grid>
			<Grid item xs={12} container>
				<form ref={formRef} onSubmit={handleOnSubmit}>
					<Grid item container xs={12} spacing={1}>
						<Grid item onMouseOver={() => setHint('A multi floor building (ex: Apartment, office building, ..etc)')} onMouseOut={() => setHint(defaultHint)}>
							<Card variant='outlined' sx={{ width: 75, height: 75 }}>
								<CardActionArea className={classes.cardActionArea} disabled={buildingType === 'BUILDING'} onClick={() => setBuildingType('BUILDING')}>
									<CardContent sx={{ height: 75 }}>
										<Grid container justifyContent='center' alignItems='center' direction='row' height='100%'>
											<Grid item><ApartmentIcon /></Grid>
											<Grid item style={{ whiteSpace: 'nowrap' }}>Multi-floor</Grid>
										</Grid>
									</CardContent>
								</CardActionArea>
							</Card>
						</Grid>
						<Grid item onMouseOver={() => setHint('A house owned by an individual')} onMouseOut={() => setHint(defaultHint)}>
							<Card variant='outlined' sx={{ width: 75, height: 75 }}>
								<CardActionArea className={classes.cardActionArea} disabled={buildingType === 'HOUSE'} onClick={() => setBuildingType('HOUSE')}>
									<CardContent sx={{ height: 75 }}>
										<Grid container justifyContent='center' alignItems='center' direction='column' height='100%'>
											<Grid item><HomeIcon /></Grid>
											<Grid item>House</Grid>
										</Grid>
									</CardContent>
								</CardActionArea>
							</Card>
						</Grid>
					</Grid>
					<Grid item xs={12} style={{ marginTop: 10 }}>
						<TextField required label='Name' className={classes.input} value={name} onChange={e => setName(e.target.value)} />
						<TextField required label='Floors' type='number' disabled={buildingType !== 'BUILDING'} className={classes.input} value={floors} onChange={e => setFloors(parseInt(e.target.value))} />
					</Grid>
				</form>
			</Grid>
		</>
	)
}
