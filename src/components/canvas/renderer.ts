import * as conf from './conf'
import { playerSprites } from './images'
import * as img from './images'
import { TileType, State } from './state'


export const render = (ctx: CanvasRenderingContext2D) => (state: State) => {
  const tileSize = conf.TILESIZE
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  
  for (let y = 0; y < state.gameMap.height; y++) {
    for (let x = 0; x < state.gameMap.width; x++) {
      const tile = state.gameMap.tiles[y][x]

      const px = x * tileSize
      const py = y * tileSize

      switch (tile) {
        case TileType.WALL:
          ctx.drawImage(img.wallImage, px, py, tileSize, tileSize)
          break
        case TileType.BREAKABLE:
          ctx.drawImage(img.breakableImage, px, py, tileSize, tileSize)
          break
        case TileType.WATER:
          ctx.drawImage(img.waterImage, px, py, tileSize, tileSize)
          break
        case TileType.EMPTY:
          ctx.fillStyle = '#dedede'
          ctx.fillRect(px, py, tileSize, tileSize)
          break
        case TileType.EXPLOSION:
          ctx.drawImage(img.explosionImage, px, py, tileSize, tileSize)
          break
      }
    }
  }

  const aliveEnemies = state.enemies.filter(enemy => enemy.alive).length
  const pauseIcon = state.paused ? img.continueImage : img.pauseImage
  const muteIcon = state.muted ? img.unmuteImage : img.muteImage

  // Afficher Stats
  ctx.drawImage(img.enemyImage, 0, (conf.HEIGHT) * tileSize, tileSize, tileSize)
  ctx.drawImage(img.levelImage, 0, (conf.HEIGHT + 1) * tileSize, tileSize, tileSize)
  ctx.drawImage(img.powerupRangeImage, tileSize * 3, (conf.HEIGHT) * tileSize, tileSize, tileSize)
  ctx.drawImage(img.powerupBombImage, tileSize * 3, (conf.HEIGHT + 1) * tileSize, tileSize, tileSize)
  ctx.drawImage(img.powerupFreezeImage, tileSize * 6, (conf.HEIGHT) * tileSize, tileSize, tileSize)
  ctx.drawImage(img.timeImage, tileSize * 6, (conf.HEIGHT + 1) * tileSize, tileSize, tileSize)
  ctx.drawImage(pauseIcon, tileSize * 10, (conf.HEIGHT) * tileSize, tileSize, tileSize)
  ctx.drawImage(img.restartImage, tileSize * 10, (conf.HEIGHT+1) * tileSize, tileSize, tileSize)
  ctx.drawImage(muteIcon, tileSize * 13, (conf.HEIGHT) * tileSize, tileSize, tileSize)
  ctx.drawImage(img.scoreImage, tileSize * 13, (conf.HEIGHT+1) * tileSize, tileSize, tileSize)
  
  ctx.fillStyle = 'brown'
  ctx.font = `${Math.floor(tileSize * 0.5)}px 'Press Start 2P'`

  ctx.fillText(`${aliveEnemies}`, tileSize, (conf.HEIGHT + 0.75) * tileSize)
  ctx.fillText(`${state.level}`, tileSize, (conf.HEIGHT + 1.75) * tileSize)
  ctx.fillText(`${state.player.bombRange}`, tileSize * 4, (conf.HEIGHT + 0.75) * tileSize)
  ctx.fillText(`${state.player.bombs}`, tileSize * 4, (conf.HEIGHT + 1.75) * tileSize)
  ctx.fillText(`${Math.ceil((state.freezeTimer ?? 0) / 60)}s`, tileSize * 7, (conf.HEIGHT + 0.75) * tileSize)
  ctx.fillText(`${Math.ceil(state.levelTimer / 60)}s`, tileSize * 7, (conf.HEIGHT + 1.75) * tileSize)
  ctx.fillText('P', tileSize * 11, (conf.HEIGHT + 0.75) * tileSize)
  ctx.fillText('R', tileSize * 11, (conf.HEIGHT + 1.75) * tileSize)
  ctx.fillText('M', tileSize * 14, (conf.HEIGHT + 0.75) * tileSize)
  ctx.fillText(`${state.score}`, tileSize * 14, (conf.HEIGHT + 1.75) * tileSize)

  // Render player
  const playerImg = playerSprites[state.player.direction]
  if (playerImg.complete) {
    ctx.drawImage(
      playerImg,
      state.player.x * tileSize,
      state.player.y * tileSize,
      tileSize,
      tileSize
    )
  }

  // Render bombs
  state.bombs.forEach(bomb => {
    ctx.drawImage(img.bombImage, bomb.x * tileSize, bomb.y * tileSize, tileSize, tileSize)
  })
  // Render explosions
  state.explosions.forEach(explosion => {
    ctx.drawImage(img.explosionImage, explosion.x * tileSize, explosion.y * tileSize, tileSize, tileSize)
    
  })
  // Render enemies
  state.enemies.forEach(enemy => {
    if (!enemy.alive) return
    ctx.drawImage(img.enemyImage, enemy.x * tileSize, enemy.y * tileSize, tileSize, tileSize)
  })
  // Render PowerUps
  state.powerups.forEach(p => {
    const powerupIcon = p.type === 'bomb' ? img.powerupBombImage : (p.type === 'range' ? img.powerupRangeImage : img.powerupFreezeImage)
    
    const isBlinking = p.duration !== undefined && p.duration < 180
    const visible = !isBlinking || Math.floor(p.duration! / 10) % 2 === 0
    if (visible) ctx.drawImage(powerupIcon, p.x * tileSize, p.y * tileSize, tileSize, tileSize)
  })
  if (state.paused){
    ctx.fillText('Game Paused', tileSize * 21.5, (conf.HEIGHT + 0.75) * tileSize)
    ctx.fillText('Press P to continue', tileSize * 19, (conf.HEIGHT + 1.75) * tileSize)
  }
  if (state.gameOver) {
    ctx.fillText('Game Over', tileSize * 21.5, (conf.HEIGHT + 0.75) * tileSize)
    ctx.fillText('Press R to restart', tileSize * 19, (conf.HEIGHT + 1.75) * tileSize)
  }
  if (!state.gameStarted){
    ctx.fillText('Press any key to start', tileSize * 17, (conf.HEIGHT + 1.25) * tileSize)
    return
  }
  if (state.victory) {
    ctx.fillText('YOU WIN', tileSize * 22, (conf.HEIGHT + 0.75) * tileSize)
    ctx.fillText('Press any key to continue', tileSize * 17, (conf.HEIGHT + 1.75) * tileSize)
  }

}