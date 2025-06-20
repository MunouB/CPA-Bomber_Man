// Sorbonne Université
// M1 STL 2024/2025
// Conception et Pratique de l’Algorithmique
// Projet final: Refonte d'une application de jeu vidéo
// ALABDULLAH Muhannad
// 21317509

// Ce fichier contient les structures des différents éléments du jeu
//
// Il contient également des fonctions pour générer la carte, et l'état initial du jeu
//
// et pour gérer les explosions des bombes

import * as conf from './conf'

export enum TileType {
	EMPTY,
	WALL,
	BREAKABLE,
	EXPLOSION,
	WATER
}

export type Player = {
	x : number
	y : number
	alive : boolean
	bombs : number
	bombRange : number
	direction : 'up' | 'down' | 'left' | 'right'
}

export type Bomb = {
	x : number
	y : number
	range : number
	timer : number
	owner : 'player' | 'enemy' // bombes des ennemis pas implémentées
}

export type Explosion = {
	x : number
	y : number
	duration : number
}

export type Enemy = {
	x : number
	y : number
	alive : boolean
	direction : 'up' | 'down' | 'left' | 'right'
	moveEvery : number // Vitesse de l'ennemi, elevée = plus lent
	aiType?: 'smart' | 'random'
}

export type GameMap = {
	width: number
	height: number
	tiles: TileType[][]
}

export type PowerUpType = 'bomb' | 'range' | 'freeze'

export type PowerUp = {
	x : number
	y : number
	type : PowerUpType
	duration? : number
}

export type FloatingText = {
	x: number
	y: number
	value: string
	duration: number
}

export type State = {
	player: Player
	bombs: Bomb[]
	explosions: Explosion[]
	enemies: Enemy[]
	gameMap: GameMap
	gameOver: boolean
	victory: boolean
	powerups: PowerUp[]
	freezeTimer?: number
	gameStarted : boolean
	level: number
	maxLevel: number
	levelTimer: number
	score: number
	paused: boolean
	muted: boolean
	zoom: number
	floatingTexts: FloatingText[]
}

export const generateMap = (width: number, height: number): TileType[][] => {
	const map: TileType[][] = []

	for (let y = 0; y < height; y++) {
		const row: TileType[] = []
		for (let x = 0; x < width; x++) {
			if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
				row.push(TileType.WALL)
			}
			else if (x % 2 === 0 && y % 2 === 0) {
				row.push(TileType.WALL)
			}
			else{
				const random = Math.random()
				if (random < conf.BREAKABLEPROBABILITY) {
					row.push(TileType.BREAKABLE)
				} else if (random < conf.WATERPROBABILITYAUX) {
					row.push(TileType.WATER)
				} else {
					row.push(TileType.EMPTY)
				}
			}
		}
		map.push(row)
	}

	// Afin de rassurer que les case de départ sont vides
	map[1][1] = TileType.EMPTY
	map[1][2] = TileType.EMPTY
	map[2][1] = TileType.EMPTY

	return map
}

export const isWalkable = (tile: TileType): boolean => {
	return tile === TileType.EMPTY || tile === TileType.WATER
}

export const explodeBomb = (bomb: Bomb, state: State) => {
	const {x, y, range} = bomb

	state.bombs = state.bombs.filter(b => b !== bomb)
	if (bomb.owner === 'player') {
		state.player.bombs++
	}
	const affectTiles = (tx: number, ty: number) => {
		if (tx >= 0 && tx < state.gameMap.width && ty >= 0 && ty < state.gameMap.height) {
			const tile = state.gameMap.tiles[ty][tx]
			if (tile === TileType.BREAKABLE) { // Casser les briques
				state.gameMap.tiles[ty][tx] = TileType.EMPTY
				state.score += conf.BREAKABLESCORE // Score pour les briques
				state.floatingTexts.push({ // Texte flottant pour le score des briques
					x: tx * conf.TILESIZE,
					y: ty * conf.TILESIZE,
					value: `+${conf.BREAKABLESCORE}`,
					duration: conf.FLOATTEXTDURATION
				})
				if (Math.random() < conf.POWERUPROBABILITY) { // Chance de faire apparaître un powerup
					const types: PowerUpType[] = ['bomb', 'range', 'freeze']
					const type = types[Math.floor(Math.random() * types.length)]

					state.powerups.push({ x: tx, y: ty, type, duration: conf.COUNTDOWN })
				}
			}
			// Afin de vérifier si une autre bombe est dans l'intervalle de l'explosion de cette bombe
			// Si oui, on l'explose aussi IMMEDIATEMENT
			const chain = state.bombs.find(b => b.x === tx && b.y === ty)
			if(chain) {
				explodeBomb(chain,state)
			}
			state.explosions.push({ x: tx, y: ty, duration: conf.EXPLOSIONDURATION })
		}
	}

	affectTiles(x, y)
	const directions = [
		{ dx: 0, dy: -1 }, // up
		{ dx: 0, dy: 1 }, // down
		{ dx: -1, dy: 0 }, // left
		{ dx: 1, dy: 0 } // right
	]

	for (const dir of directions) {
		for (let i = 1; i <= range; i++) {
			const tx = x + dir.dx * i
			const ty = y + dir.dy * i
			if (tx < 0 || tx >= state.gameMap.width || ty < 0 || ty >= state.gameMap.height) break
			
			const tile = state.gameMap.tiles[ty][tx]
			if (tile === TileType.WALL || tile === TileType.WATER) break // On ne peut pas casser les murs ni brûler l'eau
			affectTiles(tx, ty)
			
			// Si le joueur ou un ennemi est touché par l'explosion
			if (state.player.alive && ((state.player.x === x && state.player.y === y) || (state.player.x === tx && state.player.y === ty))) {
				state.player.alive = false
				state.gameOver = true
			}
			// Si un ennemi est touché par l'explosion
			state.enemies.forEach(enemy => {
				if (enemy.alive && enemy.x === tx && enemy.y === ty) {
					enemy.alive = false
					state.score += conf.ENEMYSCORE // Score pour les ennemis
					state.floatingTexts.push({ // Texte flottant pour le score des ennemis
						x: enemy.x * conf.TILESIZE,
						y: enemy.y * conf.TILESIZE,
						value: `+${conf.ENEMYSCORE}`,
						duration: conf.FLOATTEXTDURATION
					})
				}
			})
			if (tile === TileType.BREAKABLE) break // On casse la brique et on arrête l'explosion
		}
	}
	// state.player.bombs++
}

// Fonction pour générer un état initial du jeu
export const createInitialState = ():State => (
	{
		player: {
			x: conf.XPLAYER,
			y: conf.YPLAYER,
			alive: true,
			bombs: conf.BOMBS,
			bombRange: conf.BOMBRANGE,
			direction: 'right',
		},
		bombs: [],
		explosions: [],
		enemies: [],
		gameMap: {
			width: conf.WIDTH,
			height: conf.HEIGHT,
			tiles: generateMap(conf.WIDTH, conf.HEIGHT),
		},
		gameOver: false,
		victory: false,
		powerups: [],
		gameStarted: false,
		level: conf.STARTINGLEVEL,
		maxLevel: conf.MAXLEVEL,
		levelTimer: conf.LEVELTIME,
		score: 0,
		paused: false,
		muted: false,
		zoom: 1.0,
		floatingTexts: [],
	}
)