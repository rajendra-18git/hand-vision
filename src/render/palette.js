/**
 * Curated color palettes for watercolor floral ink rendering
 * Includes botanical petunia garland inspired by the reference illustration.
 */
export const PALETTES = {
  whiteDaisy: {
    id: 'whiteDaisy',
    name: 'Classic White Daisy',
    stemColor: 'rgba(46, 125, 50, 0.9)',
    leafColor: 'rgba(56, 142, 60, 0.92)',
    leafHighlight: 'rgba(129, 199, 132, 0.88)',
    leafShadow: 'rgba(27, 94, 32, 0.95)',
    flowers: [
      {
        type: 'daisy',
        primary: 'rgba(255, 255, 255, 0.99)',
        secondary: 'rgba(248, 250, 252, 0.95)',
        petalShadow: 'rgba(203, 213, 225, 0.55)',
        petalGroove: 'rgba(226, 232, 240, 0.65)',
        petalBase: 'rgba(254, 240, 138, 0.45)', // Warm golden glow at petal root
        throat: 'rgba(217, 119, 6, 0.95)',      // Amber eye rim
        center: 'rgba(245, 158, 11, 0.98)',     // Rich golden sunflower disc
        centerHighlight: 'rgba(253, 224, 71, 0.98)',
        stippleDark: 'rgba(180, 83, 9, 0.85)',
        stippleLight: 'rgba(254, 249, 195, 0.95)',
        pistil: 'rgba(254, 240, 138, 0.95)'
      }
    ]
  },
  petuniaGarland: {
    id: 'petuniaGarland',
    name: 'Petunia Garland',
    stemColor: 'rgba(34, 84, 48, 0.85)',
    leafColor: 'rgba(46, 125, 70, 0.9)',
    leafHighlight: 'rgba(110, 195, 125, 0.85)',
    leafShadow: 'rgba(20, 60, 35, 0.95)',
    flowers: [
      // 1. Violet-Throated Orchid Petunia (Dark fuchsia starburst to soft lilac rim)
      {
        type: 'petunia',
        primary: 'rgba(235, 215, 245, 0.95)',
        secondary: 'rgba(168, 85, 247, 0.9)',
        throat: 'rgba(112, 18, 88, 0.98)',
        veinColor: 'rgba(134, 25, 105, 0.7)',
        center: 'rgba(65, 10, 52, 0.98)',
        pistil: 'rgba(255, 250, 205, 0.95)'
      },
      // 2. Royal Velvet Purple Petunia
      {
        type: 'petunia',
        primary: 'rgba(147, 51, 234, 0.95)',
        secondary: 'rgba(107, 33, 168, 0.95)',
        throat: 'rgba(59, 7, 100, 0.98)',
        veinColor: 'rgba(49, 5, 80, 0.8)',
        center: 'rgba(35, 4, 60, 0.98)',
        pistil: 'rgba(255, 235, 150, 0.95)'
      },
      // 3. White & Magenta Starburst Petunia
      {
        type: 'petunia',
        primary: 'rgba(255, 255, 255, 0.98)',
        secondary: 'rgba(244, 114, 182, 0.85)',
        throat: 'rgba(190, 24, 93, 0.98)',
        veinColor: 'rgba(157, 23, 77, 0.75)',
        center: 'rgba(131, 24, 67, 0.98)',
        pistil: 'rgba(255, 240, 180, 0.95)'
      },
      // 4. Blush Pink & Lilac Flare
      {
        type: 'petunia',
        primary: 'rgba(251, 207, 232, 0.95)',
        secondary: 'rgba(216, 70, 140, 0.9)',
        throat: 'rgba(159, 18, 57, 0.98)',
        veinColor: 'rgba(136, 19, 55, 0.7)',
        center: 'rgba(80, 7, 36, 0.98)',
        pistil: 'rgba(255, 230, 130, 0.95)'
      }
    ]
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura Blossom',
    stemColor: 'rgba(64, 110, 78, 0.75)',
    leafColor: 'rgba(100, 160, 110, 0.85)',
    leafHighlight: 'rgba(160, 210, 170, 0.8)',
    leafShadow: 'rgba(40, 80, 50, 0.9)',
    flowers: [
      {
        type: 'cherry',
        primary: 'rgba(255, 183, 197, 0.9)',
        secondary: 'rgba(255, 105, 180, 0.8)',
        throat: 'rgba(225, 29, 72, 0.9)',
        veinColor: 'rgba(190, 24, 93, 0.5)',
        center: 'rgba(255, 235, 150, 0.95)',
        pistil: 'rgba(255, 215, 0, 0.95)'
      },
      {
        type: 'cherry',
        primary: 'rgba(255, 220, 230, 0.95)',
        secondary: 'rgba(244, 63, 94, 0.8)',
        throat: 'rgba(190, 18, 60, 0.9)',
        veinColor: 'rgba(159, 18, 57, 0.5)',
        center: 'rgba(255, 240, 170, 0.95)',
        pistil: 'rgba(255, 215, 0, 0.95)'
      }
    ]
  },
  goldenGlow: {
    id: 'goldenGlow',
    name: 'Golden Bloom',
    stemColor: 'rgba(92, 115, 54, 0.75)',
    leafColor: 'rgba(135, 170, 85, 0.85)',
    leafHighlight: 'rgba(190, 220, 130, 0.8)',
    leafShadow: 'rgba(60, 85, 30, 0.9)',
    flowers: [
      {
        type: 'petunia',
        primary: 'rgba(255, 215, 0, 0.95)',
        secondary: 'rgba(245, 158, 11, 0.85)',
        throat: 'rgba(180, 83, 9, 0.98)',
        veinColor: 'rgba(146, 64, 14, 0.7)',
        center: 'rgba(120, 53, 15, 0.98)',
        pistil: 'rgba(255, 250, 205, 0.95)'
      },
      {
        type: 'petunia',
        primary: 'rgba(254, 240, 138, 0.95)',
        secondary: 'rgba(234, 88, 12, 0.85)',
        throat: 'rgba(154, 52, 18, 0.98)',
        veinColor: 'rgba(124, 45, 18, 0.7)',
        center: 'rgba(69, 26, 3, 0.98)',
        pistil: 'rgba(255, 245, 180, 0.95)'
      }
    ]
  },
  emeraldFlora: {
    id: 'emeraldFlora',
    name: 'Emerald Enchant',
    stemColor: 'rgba(40, 90, 70, 0.8)',
    leafColor: 'rgba(60, 150, 110, 0.85)',
    leafHighlight: 'rgba(130, 220, 170, 0.8)',
    leafShadow: 'rgba(25, 70, 45, 0.9)',
    flowers: [
      {
        type: 'petunia',
        primary: 'rgba(167, 243, 208, 0.95)',
        secondary: 'rgba(52, 211, 153, 0.85)',
        throat: 'rgba(5, 150, 105, 0.98)',
        veinColor: 'rgba(4, 120, 87, 0.7)',
        center: 'rgba(6, 78, 59, 0.98)',
        pistil: 'rgba(255, 250, 205, 0.95)'
      }
    ]
  },
  cyberBloom: {
    id: 'cyberBloom',
    name: 'Neon Cyber-Bloom',
    stemColor: 'rgba(0, 255, 200, 0.75)',
    leafColor: 'rgba(0, 200, 255, 0.8)',
    leafHighlight: 'rgba(150, 240, 255, 0.9)',
    leafShadow: 'rgba(0, 100, 180, 0.9)',
    flowers: [
      {
        type: 'petunia',
        primary: 'rgba(255, 0, 128, 0.95)',
        secondary: 'rgba(168, 85, 247, 0.85)',
        throat: 'rgba(128, 0, 255, 0.98)',
        veinColor: 'rgba(255, 0, 255, 0.8)',
        center: 'rgba(0, 255, 255, 0.98)',
        pistil: 'rgba(255, 255, 255, 0.95)'
      }
    ]
  }
};

export const PALETTE_LIST = Object.values(PALETTES);
