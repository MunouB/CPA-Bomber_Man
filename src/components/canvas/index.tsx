// Sorbonne Université
// M1 STL 2024/2025
// Conception et Pratique de l’Algorithmique
// Projet final: Refonte d'une application de jeu vidéo
// ALABDULLAH Muhannad
// 21317509

import * as conf from './conf'
import { useEffect, useRef } from 'react'
import { generateMap, isWalkable, State, TileType, explodeBomb, Enemy, createInitialState} from './state'
import { render } from './renderer'

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
  
    // Regénérer une nouvelle carte
    state.current.gameMap.tiles = generateMap(state.current.gameMap.width, state.current.gameMap.height)
  
    // Rendre le joueur et les ennemis à leurs états initiaux
    state.current.player.x = conf.XPLAYER
    state.current.player.y = conf.YPLAYER
    state.current.player.alive = true
    state.current.player.bombs = conf.BOMBS
    state.current.player.bombRange = conf.BOMBRANGE
  
    // Augmenter le nombre d'ennemis pour rendre le jeu plus difficile
    const enemyCount = conf.ENEMIES + (nextLevel - 1) * conf.ADDITIONALENEMIES
    const enemies = []
    while(enemies.length < enemyCount) {
      const x = Math.floor(Math.random() * state.current.gameMap.width)
      const y = Math.floor(Math.random() * state.current.gameMap.height)
      const tile = state.current.gameMap.tiles[y][x]

      if (tile === TileType.EMPTY && x >= conf.XENEMY && y >= conf.YENEMY) {
        enemies.push({
          x,
          y,
          direction: 'right' as 'right',
          alive: true,
          moveEvery: 0,
          aiType: Math.random() < conf.SMARTPROBABILITY ? 'smart' : 'random'
        })
      }
    }
    
    state.current.enemies = enemies as Enemy[]
  
    // Rendre les powerups, les bombes et les explosions à leurs états initiaux
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
  music.volume = conf.VOLUME
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
  
        if (tile === TileType.EMPTY && x >= conf.XENEMY && y >= conf.YENEMY) {
          enemies.push({
            x,
            y,
            direction: 'up' as 'up',
            alive: true,
            moveEvery: 0,
            aiType: Math.random() < conf.SMARTPROBABILITY ? 'smart' as 'smart' : 'random' as 'random'
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
        // Test effectuer afin de ne pas poser une bombe sur un mur, de l'eau ou une autre bombe
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
      // Zoom in and out avec le clavier
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
      // Rassurer que le joueur ne se déplace pas sur une bombe, et qu'il peut se déplacer si il est debout sur une bombe
      if (isBombThere && !isStandingOnBomb) return
      if (isWalkable(tile)) {
        state.current.player.x = newX
        state.current.player.y = newY
      }
    }
  }

  // Game loop
  const iterate = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)


    if (state.current.gameStarted && !state.current.gameOver && !state.current.victory){
      state.current.levelTimer--
      if (state.current.levelTimer <= 0){
        state.current.gameOver = true
      }
    }

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

      // Prioriser la direction actuelle de l'ennemi
      // En premier, on essaie de se déplacer dans la direction actuelle
      // Ensuite, on essaie de se déplacer dans les autres directions
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

      // Une probabilité de mouvement aléatoire
      // Si l'ennemi n'a pas bougé, il peut changer de direction aléatoirement
      if (!moved && Math.random() < conf.RANDOMPROBABILITY){
        const dirs: Enemy['direction'][] = ['up', 'down', 'left', 'right']
        enemy.direction = dirs[Math.floor(Math.random() * dirs.length)]
      }
      enemy.moveEvery = conf.ENEMYSPEED
    }

    // Vérifier si le joueur est touché par un ennemi
    state.current.enemies.forEach(enemy => {
      if (enemy.alive && state.current.player.alive && state.current.player.x === enemy.x && state.current.player.y === enemy.y) {
        state.current.player.alive = false
        state.current.gameOver = true
      }
    })

    // Les powerups disparaissent après un certain temps
    state.current.powerups = state.current.powerups.map(p => ({ ...p, duration: p.duration! - 1 })).filter(p => p.duration! > 0)
    
    state.current.powerups = state.current.powerups.filter(p => {
      if (p.x === state.current.player.x && p.y === state.current.player.y) {
        if (p.type === 'bomb') state.current.player.bombs++
        if (p.type === 'range') state.current.player.bombRange++
        if (p.type === 'freeze') state.current.freezeTimer = conf.FREEZETIMER

        state.current.score += conf.POWERUPSCORE // Score pour les powerups
        state.current.floatingTexts.push({ // Texte flottant pour le score de la collection des powerups
          x: p.x * conf.TILESIZE,
          y: p.y * conf.TILESIZE,
          value: `+${conf.POWERUPSCORE}`,
          duration: conf.FLOATTEXTDURATION
        })
        return false
      }
      return true
    })
    // Les textes flottants disparaissent après un certain temps
    state.current.floatingTexts = state.current.floatingTexts.map(text => ({...text, y: text.y - 1, duration: text.duration - 1})).filter(text => text.duration > 0)

    if (!state.current.victory && state.current.enemies.length > 0 && state.current.enemies.every(e => !e.alive)) {
      state.current.victory = true
      state.current.score += Math.ceil(state.current.levelTimer / conf.SECOND) * conf.TIMESCORE // Score pour le temps restant
      state.current.levelTimer = 0
    }

    // Breadth-first search pour trouver le prochain mouvement de l'ennemi
    // On cherche le chemin le plus court vers le joueur
    // On utilise un ensemble pour garder une trace des cases déjà visitées

    function findNextStep(map: TileType[][], start: {x: number, y: number}, goal: {x: number, y: number}): {x: number, y: number} | null {
      const visited = new Set()
      // On utilise une queue pour explorer les voisins de chaque case
      // On commence par la position de l'ennemi
      const queue: {x: number, y: number, path: {x: number, y: number}[]}[] = [{ x: start.x, y: start.y, path: [] }]
      const directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }, 
      ]
      // On utilise une approche de recherche en largeur (BFS) pour trouver le chemin le plus court
      while (queue.length > 0) {
        const { x, y, path } = queue.shift()!
        const key = `${x},${y}`
        if (visited.has(key)) continue
        visited.add(key)
        // Si on trouve le joueur, on retourne la position du joueur, sinon on retourne null (on n'a pas trouvé de chemin)
        if (x === goal.x && y === goal.y) {
          return path[0] ?? null
        }
        // On explore les voisins de la case actuelle
        for (const d of directions) {
          const nx = x + d.x
          const ny = y + d.y
          const isInBounds = nx >= 0 && nx < state.current.gameMap.width && ny >= 0 && ny < state.current.gameMap.height
          const tile = isInBounds ? state.current.gameMap.tiles[ny][nx] : TileType.WALL
          const isBlocked = !isWalkable(tile) || state.current.bombs.some(b => b.x === nx && b.y === ny)

          // Si le voisin est dans les limites de la carte et n'est pas bloqué, on l'ajoute à la queue
          if (!isBlocked) {
            queue.push({ x: nx, y: ny, path: [...path, { x: nx, y: ny }] })
          }
        }
      }
    
      return null
    }
    

    state.current.enemies.forEach(enemy => {
      if (!enemy.alive || (state.current.freezeTimer && state.current.freezeTimer > 0)) return
      if (enemy.aiType === 'smart') {
        enemy.moveEvery++
        // Contrôler la vitesse de l'ennemi
        if (enemy.moveEvery < conf.ENEMYSPEED) return
        enemy.moveEvery = 0
        const step = findNextStep(state.current.gameMap.tiles, enemy, state.current.player)
        if (step) {
          enemy.x = step.x
          enemy.y = step.y
        }
        // S'il n'y a pas de chemin vers le joueur, on déplace l'ennemi aléatoirement
        else{
          const directions = ['up', 'down', 'left', 'right'].sort(() => Math.random() - 0.5)
          for (const dir of directions) {
            const [dx, dy] = dir === 'up' ? [0, -1]
                          : dir === 'down' ? [0, 1]
                          : dir === 'left' ? [-1, 0]
                          : [1, 0]
            const tx = enemy.x + dx
            const ty = enemy.y + dy
            const tile = state.current.gameMap.tiles[ty]?.[tx]
            if (tile === TileType.EMPTY || tile === TileType.WATER) {
              enemy.x = tx
              enemy.y = ty
              break
            }
          }
        }
      }
      else tryMoveEnemy(enemy)
    })

    // const loop = () => {
    //   requestAnimationFrame(loop)
    //   if(!state.current.paused) iterate(ctx)
    //   render(ctx)(state.current)
      
    // }

    if (!state.current.paused){
      requestAnimationFrame(() => iterate(ctx))
    }
    // Si le jeu est en pause, on attend que l'utilisateur appuie sur 'p' pour reprendre
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
    // Zoomer et dézoomer avec la molette de la souris
    const onWheel = (e: WheelEvent) => {
      if (!state.current.gameStarted) return
      const zoomFactor = conf.ZOOMFACTOR
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
