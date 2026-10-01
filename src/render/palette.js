/**
 * Realistic Botanical Flower Collection & Color Configuration
 * Contains high-definition photographic assets, scientific names, botanical families,
 * and aesthetic badge gradients for interactive garden exploration.
 */

export const FLOWER_COLLECTION = {
  allMix: {
    id: 'allMix',
    name: 'Botanical Garden Mix',
    scientificName: 'Flora Varietate',
    family: 'Diverse Botanical Garden',
    description: 'A rich, vibrant tapestry featuring Dahlias, Purple Roses, Frangipani, African Daisies, and Chamomile.',
    emoji: '🌸',
    color: '#ec4899',
    badgeGradient: 'linear-gradient(135deg, #f472b6, #8b5cf6, #3b82f6)',
    species: ['pinkDahlia', 'purpleRose', 'pinkPlumeriaFrangipani', 'pinkPlumeria', 'blueAfricanDaisy', 'whiteDaisy']
  },
  pinkDahlia: {
    id: 'pinkDahlia',
    name: 'Pink Dahlia',
    scientificName: 'Dahlia pinnata',
    family: 'Asteraceae',
    description: 'Vibrant layered petals forming a rich geometric bloom with a radiant golden disk floret center.',
    emoji: '🌸',
    color: '#ec4899',
    badgeGradient: 'linear-gradient(135deg, #f472b6, #db2777)',
    image: './assets/flowers/pink_dahlia.png',
    defaultScale: 1.25,
    bloomDuration: 360
  },
  purpleRose: {
    id: 'purpleRose',
    name: 'Purple Rose',
    scientificName: 'Rosa "Ebb Tide"',
    family: 'Rosaceae',
    description: 'Velvety purple layered petals with delicate ruffled margins, golden rim highlights, and deep shadow depth.',
    emoji: '💜',
    color: '#9333ea',
    badgeGradient: 'linear-gradient(135deg, #a855f7, #6b21a8)',
    image: './assets/flowers/purple_rose.png',
    defaultScale: 1.2,
    bloomDuration: 380
  },
  pinkPlumeriaFrangipani: {
    id: 'pinkPlumeriaFrangipani',
    name: 'Pink Plumeria (Frangipani)',
    scientificName: 'Plumeria rubra',
    family: 'Apocynaceae',
    description: 'Soft tropical pastel petals with a sunlit yellow-orange glowing center and smooth spiraling curves.',
    emoji: '🌺',
    color: '#f43f5e',
    badgeGradient: 'linear-gradient(135deg, #fda4af, #f59e0b)',
    image: './assets/flowers/pink_plumeria_frangipani.png',
    defaultScale: 1.2,
    bloomDuration: 340
  },
  pinkPlumeria: {
    id: 'pinkPlumeria',
    name: 'Pink Plumeria',
    scientificName: 'Plumeria obtusa',
    family: 'Apocynaceae',
    description: 'Five distinct vibrant pink petals with rich fuchsia edges and a sunny yellow core.',
    emoji: '🌸',
    color: '#e11d48',
    badgeGradient: 'linear-gradient(135deg, #fb7185, #e11d48)',
    image: './assets/flowers/pink_plumeria.png',
    defaultScale: 1.15,
    bloomDuration: 320
  },
  blueAfricanDaisy: {
    id: 'blueAfricanDaisy',
    name: 'Blue African Daisy',
    scientificName: 'Osteospermum ecklonis',
    family: 'Asteraceae',
    description: 'Radiating sapphire blue elongated petals surrounding an intricate deep navy textured center disk.',
    emoji: '💙',
    color: '#3b82f6',
    badgeGradient: 'linear-gradient(135deg, #60a5fa, #1d4ed8)',
    image: './assets/flowers/blue_african_daisy.png',
    defaultScale: 1.2,
    bloomDuration: 350
  },
  whiteDaisy: {
    id: 'whiteDaisy',
    name: 'White Daisy',
    scientificName: 'Bellis perennis',
    family: 'Asteraceae',
    description: 'Pristine radiating white ray petals with longitudinal ridges surrounding a tactile golden disc center.',
    emoji: '🌼',
    color: '#facc15',
    badgeGradient: 'linear-gradient(135deg, #ffffff, #facc15)',
    image: './assets/flowers/white_daisy.png',
    defaultScale: 1.15,
    bloomDuration: 320
  }
};

export const FLOWER_LIST = Object.values(FLOWER_COLLECTION);
