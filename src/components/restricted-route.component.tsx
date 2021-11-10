import { FC, ReactNode, useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { appContext } from "../App";

export const RestrictedRoute: FC<{ children: ReactNode }> = ({ children }) => {
	const { connected } = useContext(appContext);
	const location = useLocation();
	return connected ? <>{children}</> : <Navigate to='/login' replace state={{ from: location.pathname }} />;
}
