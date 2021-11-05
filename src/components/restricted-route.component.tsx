import { makeStyles } from "@mui/styles";
import { FC, useContext } from "react";
import { Navigate, Route, RouteProps, useLocation } from "react-router-dom";
import { appContext } from "../App";
import { AppBarComponent } from './app-bar.component';

const useStyles = makeStyles(() => ({
	root: {
		display: "flex",
		flexFlow: "column",
		height: "100vh"
	},
	child: {
		flex: '1 1 auto',
	},
}));

export const RestrictedRoute: FC<RouteProps> = (props) => {
	const { connected } = useContext(appContext);
	const classes = useStyles();
	const location = useLocation();
	return connected ? (
	<div className={classes.root}>
		<AppBarComponent title='Captive Portal JS' />
		<div className={classes.child}>
			<Route {...props} />
		</div>
	</div>
	) : <Navigate to={'/login'} replace state={{ from: location.pathname }} />;
}
