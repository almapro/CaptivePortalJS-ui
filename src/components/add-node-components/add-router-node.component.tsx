import _ from 'lodash';
import { Grid, Typography, TextField } from "@mui/material"
import { makeStyles } from "@mui/styles"
import { Neo4jError, Session } from "neo4j-driver"
import { useSnackbar } from "notistack"
import { ChangeEvent, createRef, FC, FormEvent, Ref, useContext, useState } from "react"
import { v4 } from "uuid"
import { appContext } from "../../App"

export type AddRouterNodeProps = {
	onDone: () => void
	formRef: Ref<HTMLFormElement>
}

export const useAddRouterNode = ({ onDone }: Omit<AddRouterNodeProps, 'formRef'>): [() => void, JSX.Element] => {
	const formRef = createRef<HTMLFormElement>();
	const callSubmit = () => {
		const form = formRef.current;
		if (form) {
			form.requestSubmit();
		}
	}
	return [callSubmit, <AddRouterNode formRef={formRef} onDone={onDone} />];
}

export const AddRouterNode: FC<AddRouterNodeProps> = ({ onDone, formRef }) => {
	const { enqueueSnackbar } = useSnackbar();
	const { darkMode, driver, database } = useContext(appContext);
	const [ip, setIp] = useState('');
	const [mac, setMac] = useState('');
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
	const createRouter = async (session: Session) => {
		const id = v4();
		const txr = session.beginTransaction();
		await txr.run(`CREATE (n:Router { id: $id, ip: $ip, mac: $mac })`, { id, ip, mac });
		await txr.commit();
		await session.close();
	}
	const handleOnSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			try {
				await createRouter(driver.session({ database }));
				enqueueSnackbar('Router node added successfuly', { variant: 'success' });
				onDone();
			} catch(e) {
				enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
			}
		}
	}
	return (
		<>
			<Grid item xs={12}>
				<Typography variant='caption'>Router</Typography>
			</Grid>
			<Grid item xs={12} container>
				<form ref={formRef} onSubmit={handleOnSubmit}>
					<TextField required label='IP' className={classes.input} error={ipError} helperText={ipError ? 'IP address must be formatted properly' : ''} value={ip} onChange={e => setIp(e.target.value)} />
					<TextField required label='MAC' placeholder='xx:xx:xx:xx:xx:xx' className={classes.input} error={macError} helperText={macError ? 'MAC address must be formatted properly' : ''} value={mac} onChange={handleMacChange} />
				</form>
			</Grid>
		</>
	)
}
