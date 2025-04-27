// Sorbonne Université
// M1 STL 2024/2025
// Conception et Pratique de l’Algorithmique
// Projet final: Refonte d'une application de jeu vidéo
// ALABDULLAH Muhannad
// 21317509

// Ce fichier contient la logique de rendu du jeu
//
// Il utilise le contexte de rendu 2D de la balise canvas pour dessiner les éléments du jeu
//
// Il utilise également des images pour représenter les différents éléments du jeu
//
// Il utilise des constantes pour définir la taille des tuiles, les couleurs du texte, etc.
//

import * as conf from './conf'
import { playerSprites } from './images'
import * as img from './images'
import { TileType, State } from './state'


export const render = (ctx: CanvasRenderingContext2D) => (state: State) => {
	const tileSize = conf.TILESIZE
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

	ctx.save()

	// Image de fond
	const pattern = ctx.createPattern(img.backgroundImage, 'repeat')
	if (pattern) {
		ctx.fillStyle = pattern
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
	}
	ctx.scale(state.zoom, state.zoom)
	
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
				case TileType.EXPLOSION:
					ctx.drawImage(img.explosionImage, px, py, tileSize, tileSize)
					break
			}
		}
	}

	const aliveEnemies = state.enemies.filter(enemy => enemy.alive).length
	const pauseIcon = state.paused ? img.continueImage : img.pauseImage
	const muteIcon = state.muted ? img.unmuteImage : img.muteImage

	// Render HUD
	ctx.drawImage(img.enemyImage, 0, (conf.HEIGHT) * tileSize, tileSize, tileSize)
	ctx.drawImage(img.levelImage, 0, (conf.HEIGHT + 1) * tileSize, tileSize, tileSize)
	ctx.drawImage(img.powerupRangeImage, tileSize * 3, (conf.HEIGHT) * tileSize, tileSize, tileSize)
	ctx.drawImage(img.powerupBombImage, tileSize * 3, (conf.HEIGHT + 1) * tileSize, tileSize, tileSize)
	ctx.drawImage(img.powerupFreezeImage, tileSize * 6, (conf.HEIGHT) * tileSize, tileSize, tileSize)
	ctx.drawImage(img.timeImage, tileSize * 6, (conf.HEIGHT + 1) * tileSize, tileSize, tileSize)
	ctx.drawImage(img.zoomInImage, tileSize * 10, (conf.HEIGHT) * tileSize, tileSize, tileSize)
	ctx.drawImage(img.zoomOutImage, tileSize * 10, (conf.HEIGHT+1) * tileSize, tileSize, tileSize)
	ctx.drawImage(pauseIcon, tileSize * 13, (conf.HEIGHT) * tileSize, tileSize, tileSize)
	ctx.drawImage(img.restartImage, tileSize * 13, (conf.HEIGHT+1) * tileSize, tileSize, tileSize)
	ctx.drawImage(muteIcon, tileSize * 16, (conf.HEIGHT) * tileSize, tileSize, tileSize)
	ctx.drawImage(img.scoreImage, tileSize * 16, (conf.HEIGHT+1) * tileSize, tileSize, tileSize)
	
	ctx.fillStyle = conf.TEXTCOLOR
	ctx.font = `${Math.floor(tileSize * 0.5)}px 'Press Start 2P'` // Font source in index.html

	// Render HUD values
	ctx.fillText(`${aliveEnemies}`, tileSize, (conf.HEIGHT + 0.75) * tileSize)
	ctx.fillText(`${state.level}`, tileSize, (conf.HEIGHT + 1.75) * tileSize)
	ctx.fillText(`${state.player.bombRange}`, tileSize * 4, (conf.HEIGHT + 0.75) * tileSize)
	ctx.fillText(`${state.player.bombs}`, tileSize * 4, (conf.HEIGHT + 1.75) * tileSize)
	ctx.fillText(`${Math.ceil((state.freezeTimer ?? 0) / 60)}s`, tileSize * 7, (conf.HEIGHT + 0.75) * tileSize)
	ctx.fillText(`${Math.ceil(state.levelTimer / 60)}s`, tileSize * 7, (conf.HEIGHT + 1.75) * tileSize)
	ctx.fillText('+', tileSize * 11, (conf.HEIGHT + 0.75) * tileSize)
	ctx.fillText('-', tileSize * 11, (conf.HEIGHT + 1.75) * tileSize)
	ctx.fillText('P', tileSize * 14, (conf.HEIGHT + 0.75) * tileSize)
	ctx.fillText('R', tileSize * 14, (conf.HEIGHT + 1.75) * tileSize)
	ctx.fillText('M', tileSize * 17, (conf.HEIGHT + 0.75) * tileSize)
	ctx.fillText(`${state.score}`, tileSize * 17, (conf.HEIGHT + 1.75) * tileSize)

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
		
		const isBlinking = p.duration !== undefined && p.duration < conf.BLINKDURATION
		const visible = !isBlinking || Math.floor(p.duration! / conf.BLINKFRAME) % 2 === 0
		if (visible) ctx.drawImage(powerupIcon, p.x * tileSize, p.y * tileSize, tileSize, tileSize)
	})

	// Render Floating texts
	state.floatingTexts.forEach(text => {
		ctx.fillStyle = `rgba(150,75,0,${text.duration / conf.FLOATTEXTDURATION})` // Fade out
		ctx.fillText(text.value, text.x + conf.TILESIZE / 2, text.y)
	})

	// Render Game state

	if (state.paused){
		ctx.fillText('Game Paused', tileSize * 21.5, (conf.HEIGHT + 0.75) * tileSize)
		ctx.fillText('Press P to continue', tileSize * 20, (conf.HEIGHT + 1.75) * tileSize)
	}
	if (state.gameOver) {
		ctx.fillText('Game Over', tileSize * 22.5, (conf.HEIGHT + 0.75) * tileSize)
		ctx.fillText('Press R to restart', tileSize * 20, (conf.HEIGHT + 1.75) * tileSize)
	}
	if (!state.gameStarted){
		ctx.font = `${Math.floor(tileSize * 0.4)}px 'Press Start 2P'`
		ctx.fillText('Press any key to start', tileSize * 20, (conf.HEIGHT + 1.25) * tileSize)
		ctx.font = `${Math.floor(tileSize * 0.5)}px 'Press Start 2P'`
		return
	}
	if (state.victory) {
		ctx.fillText('YOU WIN', tileSize * 23.5, (conf.HEIGHT + 0.75) * tileSize)
		ctx.font = `${Math.floor(tileSize * 0.4)}px 'Press Start 2P'`
		ctx.fillText('Press any key to continue', tileSize * 20, (conf.HEIGHT + 1.75) * tileSize)
		ctx.font = `${Math.floor(tileSize * 0.5)}px 'Press Start 2P'`
	}

	ctx.restore()

}