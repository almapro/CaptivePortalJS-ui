import { Menu, MenuItem } from "@material-ui/core"
import { createRef, FC, useEffect, useState } from "react"

export type ContextMenuProps = {
	node: string
	x: number
	y: number
	items: [string, (id: string) => void][]
	open: boolean
	closeMenu: () => void
	elm: HTMLDivElement | null
}

export const ContextMenu: FC<ContextMenuProps> = ({ x, y, node, closeMenu, items, open, elm }) => {
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
	}, [menuRef.current, x, y, setTop, setLeft, items]);
	return (
		<Menu anchorEl={elm} anchorReference="anchorPosition" anchorPosition={{ left, top }} PaperProps={{ ref: menuRef }} keepMounted open={open && items.length > 0} onClick={() => closeMenu()}>
		{items.map((item, idx) => (
			<MenuItem key={idx} onClick={() => item[1](node)}>{item[0]}</MenuItem>
		))}
		</Menu>
	);
}
