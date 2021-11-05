import { Dialog, Grid, CardContent, Card, CardActionArea, Divider, Typography, Button, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { makeStyles } from "@mui/styles";
import {
	Wifi as WifiIcon,
	Router as RouterIcon,
	WifiTethering as WifiTetheringIcon,
	HomeWork as HomeWorkIcon,
} from "@mui/icons-material";
import { FC, useContext, useState } from "react";
import { appContext } from "../App";
import { useAddBuildingNode, useAddWifiNode, useAddHotspotNode, useAddRouterNode } from "./add-node-components";

export type AddNodeProps = {
	show: boolean
	close: () => void
	onDone: () => void
}

export type FileOperationType = 'UPLOAD' | 'DOWNLOAD' | 'DELETE';

export type NodeType = 'WIFI' | 'CLIENT' | 'ROUTER' | 'SERVER' | 'NETWORK' | 'HOTSPOT' | 'SERVICE' | 'RELATION' | 'BUILDING' | 'HOUSE' | 'FLOOR';

export type WithHintComponent = {
	setHint: (hint: string) => void
	defaultHint: string
}

export const AddNode: FC<AddNodeProps> = ({ show, close, onDone: onDoneParent }) => {
	const { theme } = useContext(appContext);
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
	// const [filesOperations, setFilesOperations] = useState<{ operationId: string, filename: string, operationType: FileOperationType, filepath: string }[]>([]);
	// const addFileOperation = (filename: string, operationType: FileOperationType, ...args: any[]) => {
	// 	const operationId = v4();
	// 	setFilesOperations([...filesOperations, { filename, operationType, filepath: '', operationId }]);
	// }
	// const removeFileOperation = (operationId: string) => {
	// 	setFilesOperations(filesOperations.filter(operation => operation.operationId !== operationId));
	// }
	// const updateFileOperationFilepath = (operationId: string, filepath: string) => {
	// 	setFilesOperations(filesOperations.map(operation => operation.operationId !== operationId ? operation : { ...operation, filepath }));
	// }
	const [nodeType, setNodeType] = useState<null | NodeType>(null);
	const nodeTypes: [JSX.Element, string, NodeType, string][] = [
		[<HomeWorkIcon />, 'Building', 'BUILDING', 'A building might be an apartment with floors or a house'],
		[<WifiIcon />, 'Wifi', 'WIFI', 'A wifi access point'],
		[<WifiTetheringIcon />, 'Hotspot', 'HOTSPOT', 'An internet sharing hotspot'],
		[<RouterIcon />, 'Router', 'ROUTER', 'A gateway for a wifi or a hotspot'],
	];
	const defaultHint = 'Hover over choices to get a hint';
	const [hint, setHint] = useState(defaultHint);
	const handleClose = () => {
		setNodeType(null);
		close();
	}
	const onDone = () => {
		onDoneParent();
		handleClose();
	}
	const [callAddWifiNodeSubmit, AddWifiNode] = useAddWifiNode({ onDone });
	const [callAddBuildingNodeSubmit, AddBuildingNode] = useAddBuildingNode({ onDone, setHint, defaultHint });
	const [callAddHotspotNodeSubmit, AddHotspotNode] = useAddHotspotNode({ onDone });
	const [callAddRouterNodeSubmit, AddRouterNode] = useAddRouterNode({ onDone });
	const handleOnClick = () => {
		switch(nodeType) {
			case 'WIFI':
				callAddWifiNodeSubmit();
				break;
			case 'BUILDING':
				callAddBuildingNodeSubmit();
				break;
			case 'HOTSPOT':
				callAddHotspotNodeSubmit();
				break;
			case 'ROUTER':
				callAddRouterNodeSubmit();
				break;
			default:
				break;
		}
	}
	return (
		<Dialog open={show} fullWidth maxWidth='lg'>
			<DialogTitle>Add a node</DialogTitle>
			<DialogContent>
				<Grid container spacing={2}>
					<Grid item container spacing={1}>
						<Grid item xs={12}>
							<Typography variant='caption'>Node type</Typography>
						</Grid>
						<Grid item container xs={12} spacing={1}>
							{nodeTypes.map((node, idx) => (
								<Grid key={idx} item onMouseOver={() => setHint(node[3])} onMouseOut={() => setHint(defaultHint)}>
									<Card variant='outlined' sx={{ width: 75, height: 75 }}>
										<CardActionArea className={classes.cardActionArea} disabled={node[2] === nodeType} onClick={() => setNodeType(node[2])}>
											<CardContent sx={{ height: 75 }}>
												<Grid container justifyContent='center' alignItems='center' direction='column' height='100%'>
													<Grid item>{node[0]}</Grid>
													<Grid item>{node[1]}</Grid>
												</Grid>
											</CardContent>
										</CardActionArea>
									</Card>
								</Grid>
							))}
						</Grid>
					</Grid>
					{nodeType !== null && <Divider variant='middle' className={classes.divider} />}
					<Grid item container spacing={1}>
						{nodeType === 'WIFI' && AddWifiNode}
						{nodeType === 'BUILDING' && AddBuildingNode}
						{nodeType === 'HOTSPOT' && AddHotspotNode}
						{nodeType === 'ROUTER' && AddRouterNode}
					</Grid>
				</Grid>
			</DialogContent>
			<DialogActions style={{ padding: theme.spacing(3) }}>
				<Grid style={{ flexGrow: 1, fontSize: 11, fontStyle: 'italic' }}>{hint}</Grid>
				<Button color='inherit' onClick={handleClose}>Cancel</Button>
				<Button variant='contained' color='primary' disabled={nodeType === null} onClick={handleOnClick}>Add</Button>
			</DialogActions>
		</Dialog>
	)
}
