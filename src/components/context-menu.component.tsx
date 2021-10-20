import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material"
import { createRef, FC, useEffect, useState } from "react"

export type ContextMenuProps = {
	node: string
	x: number
	y: number
	items: [JSX.Element, string, (id: string) => void][]
	open: boolean
	closeMenu: () => void
}

export const ContextMenu: FC<ContextMenuProps> = ({ x, y, node, closeMenu, items, open }) => {
	const menuRef = createRef<HTMLDivElement>();
	const [top, setTop] = useState(y);
	const [left, setLeft] = useState(x);
	useEffect(() => {
		if (menuRef.current) {
			const rect = menuRef.current.getBoundingClientRect();
			let innerX = x, innerY = y;
			if (x + rect.width > window.innerWidth) {
				innerX = Math.floor(window.innerWidth - rect.width - 10);
			}
			if (y + rect.height > window.innerHeight) {
				innerY = Math.floor(window.innerHeight - rect.height - 10);
			}
			setTop(innerY);
			setLeft(innerX);
		}
	}, [menuRef, x, y, setTop, setLeft, items]);
	return (
		<Menu anchorReference="anchorPosition" anchorPosition={{ left, top }} PaperProps={{ ref: menuRef }} keepMounted open={open && items.length > 0} onClick={() => closeMenu()}>
		{items.map((item, idx) => (
			<MenuItem key={idx} onClick={() => item[2](node)}>
				<ListItemIcon>{item[0]}</ListItemIcon>
				<ListItemText>{item[1]}</ListItemText>
			</MenuItem>
		))}
		</Menu>
	);
}
