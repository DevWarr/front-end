import React, { useState, useEffect, useRef, useCallback } from 'react';
import Tile from './Tile';
import Player from './Player';
import { WallTile, BuildingTile } from '../utils/tileClass';

const roomSizes = [
	{ width: 16, height: 16, door: { x: 8, y: 15 } },
	{ width: 16, height: 8, door: { x: 8, y: 7 } },
	{ width: 16, height: 8, door: { x: 8, y: 7 } },
	{ width: 8, height: 8, door: { x: 4, y: 7 } },
	{ width: 8, height: 8, door: { x: 4, y: 7 } },
];
const boardWidth = 35; // = 32 + 1 walkway + 2 border
const boardHeight = 35;

function GameBoard({ muted }) {
	const [board, setBoard] = useState(null);
	const [playerX, setPlayerX] = useState(null);
	const [playerY, setPlayerY] = useState(null);
	const [isInside, setIsInside] = useState(null);

	function createBoard(tempBoard) {
		// creates 2d array that will make up the board
		for (let i = 0; i < boardHeight; i++) {
			const row = [];

			for (let j = 0; j < boardWidth; j++) {
				row.push(null);
			}
			tempBoard.push(row);
		}

		//creating a walltile object
		const wall = new WallTile();

		// drawing the border with walltiles
		for (let i = 0; i < boardHeight; i++) {
			tempBoard[i][0] = wall;
			tempBoard[i][boardWidth - 1] = wall;
		}
		for (let j = 0; j < boardWidth; j++) {
			tempBoard[0][j] = wall;
			tempBoard[boardHeight - 1][j] = wall;
		}
	}

	const createRoom = useCallback((tempBoard, roomSize) => {
		const wall = new WallTile();
		let w, h, xLoc, yLoc;
		do {
			w = roomSize.width;
			h = roomSize.height;
			let xNumber = (boardWidth - 3) / w;
			let yNumber = (boardHeight - 3) / h;

			xLoc = Math.floor(Math.random() * xNumber) * w + 1;

			yLoc = Math.floor(Math.random() * yNumber) * h + 1;
		} while (boardHasConflict(tempBoard, xLoc, yLoc, w, h));

		const building = new BuildingTile();
		for (let i = yLoc + 1; i < yLoc + h; i++) {
			for (let j = xLoc + 1; j < xLoc + w; j++) {
				tempBoard[i][j] = building;
			}
		}

		// generates the walls/outline of the rooms
		for (let i = yLoc + 1; i < yLoc + h; i++) {
			tempBoard[i][xLoc + 1] = wall;
			tempBoard[i][xLoc + w - 1] = wall;
		}
		for (let j = xLoc + 1; j < xLoc + w; j++) {
			tempBoard[yLoc + 1][j] = wall;
			tempBoard[yLoc + h - 1][j] = wall;
		}
		if (roomSize.door) {
			tempBoard[roomSize.door.y + yLoc][roomSize.door.x + xLoc] = null;
		}
	}, []);

	const generateRooms = useCallback(() => {
		const tempBoard = [];
		// height
		createBoard(tempBoard);
		// populating board

		for (let roomSize of roomSizes) {
			createRoom(tempBoard, roomSize);
		}
		// place player
		let xLoc, yLoc;
		do {
			xLoc = Math.floor(Math.random() * boardWidth);
			yLoc = Math.floor(Math.random() * boardHeight);
		} while (boardHasConflict(tempBoard, xLoc, yLoc, 1, 1));

		setPlayerX(xLoc);
		setPlayerY(yLoc);

		if (tempBoard[yLoc][xLoc] instanceof BuildingTile) {
			setIsInside(true);
		} else {
			setIsInside(false);
		}

		setBoard(tempBoard);
	}, [createRoom]);

	const savedListener = useRef();

	const keyDown = useCallback(
		(event) => {
			let x = playerX;
			let y = playerY;

			switch (event.key) {
				// move up
				case 'w':
					y -= 1;

					break;
				// move down
				case 's':
					y += 1;

					break;
				// move left
				case 'a':
					x -= 1;

					break;
				// move right
				case 'd':
					x += 1;

					break;
				default:
					break;
			}
			if (!board[y][x] || board[y][x].passable) {
				setPlayerX(x);
				setPlayerY(y);
				if (!walkAudio.current.ended) {
					walkAudio.current.currentTime = 0;
				}
				walkAudio.current.play();
			} else {
				whoops.current.play();
			}
		},
		[playerX, playerY, board],
	);
	const walkAudio = useRef();
	const whoops = useRef();
	const beepBoop = useRef();

	useEffect(() => {
		generateRooms();

		walkAudio.current = new Audio(
			'https://robot-versus-zombies.github.io/sounds/07%20Step01.wav',
		);
		whoops.current = new Audio(
			'https://robot-versus-zombies.github.io/sounds/06%20Swing%20n%20Miss.wav',
		);

		beepBoop.current = new Audio(
			'https://robot-versus-zombies.github.io/sounds/05%20Beep%20Boop%20Mellow.wav',
		);
		beepBoop.current.loop = true;
	}, [generateRooms]);

	useEffect(() => {
		window.removeEventListener('keydown', savedListener.current);
		savedListener.current = keyDown;
		window.addEventListener('keydown', keyDown);

		// checking to see if player is about to enter a building
		if (
			board &&
			board[playerY][playerX] instanceof BuildingTile &&
			!isInside
		) {
			setIsInside(true);
		} else if (
			!(board && board[playerY][playerX] instanceof BuildingTile) &&
			isInside
		) {
			setIsInside(false);
		}

		let boardEl = document.querySelector('.game-board-container');
		let scrollX = playerX * 42 - 500;
		scrollX = Math.max(scrollX, 0);
		scrollX = Math.min(scrollX, 42 * boardWidth - 1000);

		let scrollY = playerY * 42 - 500;
		scrollY = Math.max(scrollY, 0);
		scrollY = Math.min(scrollY, 42 * boardHeight - 1000);

		boardEl.scroll(scrollX, scrollY);
	}, [playerX, playerY, keyDown, isInside, board]);

	useEffect(() => {
		if (isInside) {
			beepBoop.current.play();
		} else {
			beepBoop.current.pause();
		}
	}, [isInside]);

	useEffect(() => {
		if (muted) {
			walkAudio.current.volume = 0;
			whoops.current.volume = 0;
			beepBoop.current.volume = 0;
		} else {
			walkAudio.current.volume = 1;
			whoops.current.volume = 1;
			beepBoop.current.volume = 1;
		}
	}, [muted]);

	function boardHasConflict(board, x, y, width, height) {
		for (let i = y; i < y + height; i++) {
			for (let j = x; j < x + width; j++) {
				if (board[i][j]) {
					return true;
				}
			}
		}
		return false;
	}

	return (
		<div className="game-board-container">
			<div className="game-board">
				<Player playerX={playerX} playerY={playerY} />
				{board?.map((row, indexY) => (
					<div className="board-row" key={indexY}>
						{row.map((tile, indexX) => (
							<Tile
								key={JSON.stringify({ indexX, indexY })}
								tileData={tile}
							/>
						))}
					</div>
				))}
			</div>
		</div>
	);
}

export default GameBoard;
