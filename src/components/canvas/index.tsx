import * as conf from './conf'
import { useEffect, useRef } from 'react'
import { generateMap, isWalkable, State, TileType, explodeBomb, Enemy, createInitialState} from './state'
import { render } from './renderer'
import { Dirent } from 'fs'

const initCanvas =
  (iterate: (ctx: CanvasRenderingContext2D) => void) =>
  (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    requestAnimationFrame(() => iterate(ctx))
  }

const Canvas = ({ height, width }: { height: number; width: number }) => {
  const initialState: State = createInitialState()

  const ref = useRef<any>()
  const state = useRef<State>(initialState)

  const advanceToNextLevel = () => {
    const nextLevel = state.current.level + 1
  
    if (nextLevel > state.current.maxLevel) {
      state.current.gameOver = true
      return
    }
  
    state.current.level = nextLevel
    state.current.victory = false
    state.current.levelTimer = conf.LEVELTIME + (nextLevel - 1) * conf.ADDITIONALTIME
  
    // Re-generate the map
    state.current.gameMap.tiles = generateMap(state.current.gameMap.width, state.current.gameMap.height)
  
    // Reset player
    state.current.player.x = 1
    state.current.player.y = 1
    state.current.player.alive = true
    state.current.player.bombs = 1
    state.current.player.bombRange = 1
  
    // Reset enemies (increase with level)
    const enemyCount = conf.ENEMIES + (nextLevel - 1) * conf.ADDITIONALENEMIES
    const enemies = []
    while(enemies.length < enemyCount) {
      const x = Math.floor(Math.random() * state.current.gameMap.width)
      const y = Math.floor(Math.random() * state.current.gameMap.height)
      const tile = state.current.gameMap.tiles[y][x]

      if (tile === TileType.EMPTY && x >= 5 && y >= 5) {
        enemies.push({
          x,
          y,
          direction: 'right' as 'right',
          alive: true,
          moveEvery: 0
        })
      }
    }
    
    state.current.enemies = enemies as Enemy[]
  
    // Reset powerups, bombs, explosions
    state.current.bombs = []
    state.current.explosions = []
    state.current.powerups = []
  }
  

  const resetGame = () => {
    const newState = createInitialState()
    Object.keys(newState).forEach(key => {
      (state.current as any)[key] = (newState as any)[key]
    })
  }

  const music = new Audio('music.mp3')
  music.loop = true
  music.volume = 0.3
  music.autoplay = false

  const handleKeyDown = (e: KeyboardEvent) => {

    if (e.key.toLowerCase() === 'r') {
      resetGame()
      music.muted = state.current.muted
      if (!music.muted) {
        music.play().catch((err) => {
          console.warn("Music play blocked on restart:", err)
        })
      }
    }

    if (!state.current.gameStarted) {
      state.current.gameStarted = true

      if (!state.current.muted) {
        music.play().catch((err) => {
          console.warn("Music play blocked:", err)
        })
      }

      const enemyCount = conf.ENEMIES
      const enemies = []

      while(enemies.length < enemyCount) {
        const x = Math.floor(Math.random() * state.current.gameMap.width)
        const y = Math.floor(Math.random() * state.current.gameMap.height)
        const tile = state.current.gameMap.tiles[y][x]
  
        if (tile === TileType.EMPTY && x >= 5 && y >= 5) {
          enemies.push({
            x,
            y,
            direction: 'up' as 'up',
            alive: true,
            moveEvery: 0
          })
        }
      }

      state.current.enemies = enemies
      return
    }

    if (state.current.victory) {
      advanceToNextLevel()
      return
    }

    if (state.current.gameOver) return

    const {x, y} = state.current.player
    let newX = x
    let newY = y
    switch (e.key) {
      case 'r':
        resetGame()
        return
      case 'ArrowUp':
      case 'z':
        state.current.player.direction = 'up'
        newY--
        break
      case 'ArrowDown':
      case 's':
        state.current.player.direction = 'down'
        newY++
        break
      case 'ArrowLeft':
      case 'q':
        state.current.player.direction = 'left'
        newX--
        break
      case 'ArrowRight':
      case 'd':
        state.current.player.direction = 'right'
        newX++
        break
      case ' ':
      case 'Enter': {
        const {x, y, bombs} = state.current.player
        const tile = state.current.gameMap.tiles[y][x]
        const alreadyExists = state.current.bombs.some(b => b.x === x && b.y === y)
        if (tile !== TileType.WALL && tile !== TileType.WATER && !alreadyExists && bombs > 0) {
          state.current.bombs.push({
            x,
            y,
            range: state.current.player.bombRange,
            timer: conf.BOMBTIME,
            owner: 'player',
          })
          state.current.player.bombs--
        }
        break
      }
      case 'p':
        state.current.paused = !state.current.paused
        break
      case 'm':
        state.current.muted = !state.current.muted
        music.muted = state.current.muted
        break
      case '+':
        state.current.zoom = Math.min(state.current.zoom + 0.1, 3.0)
        break
      case '-':
        state.current.zoom = Math.max(state.current.zoom - 0.1, 0.5)
        break
    }
    if (newX >= 0 && newX < state.current.gameMap.width && newY >= 0 && newY < state.current.gameMap.height) {
      const tile = state.current.gameMap.tiles[newY][newX]

      const isBombThere = state.current.bombs.some(b => b.x === newX && b.y === newY)
      const isStandingOnBomb = state.current.bombs.some(b => b.x === x && b.y === y)
      if (isBombThere && !isStandingOnBomb) return
      if (isWalkable(tile)) {
        state.current.player.x = newX
        state.current.player.y = newY
      }
    }
  }

  const iterate = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)


    if (state.current.gameStarted && !state.current.gameOver && !state.current.victory){
      state.current.levelTimer--
      if (state.current.levelTimer <= 0){
        state.current.gameOver = true
      }
    }

    // const explodedBombs = state.current.bombs.filter(bomb => bomb.timer <= 0)
    // explodedBombs.forEach(bomb => {
    //   explodeBomb(bomb, state.current)
    // })

    // state.current.bombs = state.current.bombs.filter(bomb => bomb.timer > 0)

    state.current.bombs.forEach(bomb => bomb.timer--)
    const toExplode = state.current.bombs.filter(b => b.timer <= 0)

    state.current.bombs.forEach(b => {
      if (b.timer > 0) b.timer--
      if (b.timer === 0) toExplode.push(b)
    })

    state.current.bombs = state.current.bombs.filter(b => !toExplode.includes(b))
    toExplode.forEach(b => explodeBomb(b,state.current))

    state.current.explosions = state.current.explosions.filter(e => {
      e.duration--
      return e.duration > 0
    })

    if (state.current.freezeTimer && state.current.freezeTimer > 0) state.current.freezeTimer--

    const tryMoveEnemy = (enemy : Enemy) => {
      if (!state.current.gameStarted) return
      if (state.current.freezeTimer && state.current.freezeTimer > 0) return

      if (enemy.moveEvery > 0){
        enemy.moveEvery--
        return
      }

      const {x, y} = enemy
      const directions: Enemy['direction'][] = ['up', 'down', 'left', 'right']

      const preferredDirs = [enemy.direction, ...directions.filter(d => d !== enemy.direction)]

      let moved = false

      for (const dir of preferredDirs) {
        let newX = x
        let newY = y
        switch (dir) {
          case 'up':
            newY--
            break
          case 'down':
            newY++
            break
          case 'left':
            newX--
            break
          case 'right':
            newX++
            break
        }

        const isInBounds = newX >= 0 && newX < state.current.gameMap.width && newY >= 0 && newY < state.current.gameMap.height
        const tile = isInBounds ? state.current.gameMap.tiles[newY][newX] : TileType.WALL
        const isBlocked = !isWalkable(tile) || state.current.bombs.some(b => b.x === newX && b.y === newY)

        if (!isBlocked) {
          enemy.x = newX
          enemy.y = newY
          enemy.direction = dir
          moved = true
          break
        }
      }

      if (!moved && Math.random() < 0.2){
        const dirs: Enemy['direction'][] = ['up', 'down', 'left', 'right']
        enemy.direction = dirs[Math.floor(Math.random() * dirs.length)]
      }
      enemy.moveEvery = 60
    }

    state.current.enemies.forEach(enemy => {
      if (enemy.alive) tryMoveEnemy(enemy)
    })

    state.current.enemies.forEach(enemy => {
      if (enemy.alive && state.current.player.alive && state.current.player.x === enemy.x && state.current.player.y === enemy.y) {
        state.current.player.alive = false
        state.current.gameOver = true
      }
    })

    state.current.powerups = state.current.powerups.map(p => ({ ...p, duration: p.duration! - 1 })).filter(p => p.duration! > 0)
    
    state.current.powerups = state.current.powerups.filter(p => {
      if (p.x === state.current.player.x && p.y === state.current.player.y) {
        if (p.type === 'bomb') state.current.player.bombs++
        if (p.type === 'range') state.current.player.bombRange++
        if (p.type === 'freeze') state.current.freezeTimer = 300

        state.current.score += 20
        return false
      }
      return true
    })
    

    if (!state.current.victory && state.current.enemies.length > 0 && state.current.enemies.every(e => !e.alive)) {
      state.current.victory = true
      state.current.score += Math.ceil(state.current.levelTimer / 60)
      state.current.levelTimer = 0
    }

    // const loop = () => {
    //   requestAnimationFrame(loop)
    //   if(!state.current.paused) iterate(ctx)
    //   render(ctx)(state.current)
      
    // }

    if (!state.current.paused){
      requestAnimationFrame(() => iterate(ctx))
    } 
    else {
      const resume = (event : KeyboardEvent) => {
        if (event.key.toLowerCase() === 'p') {
          state.current.paused = false
          window.removeEventListener('keydown', resume)
          requestAnimationFrame(() => iterate(ctx))
        }
      }
      window.addEventListener('keydown', resume)
    }
    // Render the game state
    render(ctx)(state.current)
  }

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!state.current.gameStarted) return
      const zoomFactor = 1.02
      if (e.deltaY < 0) state.current.zoom *= zoomFactor
      else state.current.zoom /= zoomFactor
      state.current.zoom = Math.max(0.5, Math.min(3, state.current.zoom))
    }
    if (ref.current) {
      initCanvas(iterate)(ref.current)
      window.addEventListener('keydown', handleKeyDown)      
      ref.current.addEventListener('wheel', onWheel)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      ref.current.removeEventListener('wheel', onWheel)
    }
  }, [])
  return <canvas {...{ height, width, ref }} />
}

export default Canvas
