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
  // SMOOTH
  // pixelX: number
  // pixelY: number
  alive : boolean
  bombs : number
  bombRange : number
  direction : 'up' | 'down' | 'left' | 'right'
  // moving : boolean
}

export type Bomb = {
  x : number
  y : number
  range : number
  timer : number
  owner : 'player' | 'enemy'
}

export type Explosion = {
  x : number
  y : number
  duration : number
}

export type Enemy = {
  x : number
  y : number
  // SMOOTH
  // pixelX: number
  // pixelY: number
  alive : boolean
  direction : 'up' | 'down' | 'left' | 'right'
  moveEvery : number
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
        if (random < 0.2) {
          row.push(TileType.BREAKABLE)
        } else if (random < 0.25) {
          row.push(TileType.WATER)
        } else {
          row.push(TileType.EMPTY)
        }
      }
    }
    map.push(row)
  }

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
      if (tile === TileType.BREAKABLE) {
        state.gameMap.tiles[ty][tx] = TileType.EMPTY
        state.score += 10
        if (Math.random() < 0.25) {
          const types: PowerUpType[] = ['bomb', 'range', 'freeze']
          const type = types[Math.floor(Math.random() * types.length)]

          state.powerups.push({ x: tx, y: ty, type, duration: conf.COUNTDOWN })
        }
      }
      const chain = state.bombs.find(b => b.x === tx && b.y === ty)
      if(chain) {
        explodeBomb(chain,state)
      }
      state.explosions.push({ x: tx, y: ty, duration: 30 })
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
      if (tile === TileType.WALL || tile === TileType.WATER) break
      affectTiles(tx, ty)
      
      if (state.player.alive && ((state.player.x === x && state.player.y === y) || (state.player.x === tx && state.player.y === ty))) {
        state.player.alive = false
        state.gameOver = true
      }
      state.enemies.forEach(enemy => {
        if (enemy.alive && enemy.x === tx && enemy.y === ty) {
          enemy.alive = false
          state.score += 25
        }
      })
      if (tile === TileType.BREAKABLE) break
    }
  }
  // state.player.bombs++
}

export const createInitialState = ():State => (
  {
    player: {
      x: 1,
      y: 1,
      // SMOOTH
      // pixelX: 1 * conf.TILESIZE,
      // pixelY: 1 * conf.TILESIZE,
      alive: true,
      bombs: 1,
      bombRange: 1,
      direction: 'right',
      // moving : false
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
    level: 1,
    maxLevel: 10,
    levelTimer: conf.LEVELTIME,
    score: 0,
    paused: false,
    muted: false,
    zoom: 1,
  }
)