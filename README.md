# Sorbonne Université

# M1 STL 2024/2025

# Conception et Pratique de l’Algorithmique

# Projet final: Refonte d'une application de jeu vidéo

# ALABDULLAH Muhannad

# 21317509

# CPA

## Pour lancer le projet

### Prérequis

- nodejs

### Installation

```bash
npm install
```

ou avec yarn

```bash
yarn install
```

### Lancer le projet

```bash
npm run start
```

ou avec yarn

```bash
yarn start
```

### Changer le cache de yarn (pour ne pas dépasser le quota de la ppit)

```bash
mkdir /Vrac/cache-yarn
yarn config set cache-folder /Vrac/cache-yarn
```

## Projet

Un jeu en 2D jouable en navigateur.

### Les éléments présents dans le jeu :

- Collision TRÈS simplifiée
- Génération aléatoire de:
	- Carte
	- Ennemis (Position, Type)
	- Powerups
- du pathfinding (BFS - Breadth First Search)

### L'exemple Implémenté :

- BOMBERMAN