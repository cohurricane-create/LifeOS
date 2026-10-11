// Theme colors, typography and spacing constants
export const COLORS = {
  // Backgrounds
  bg: '#0F0F0F',
  bgCard: '#1A1A1A',
  bgInput: '#222222',
  bgModal: '#1E1E1E',

  // Brand
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4A42CC',

  // Accents
  income: '#4CAF50',
  expense: '#FF5252',
  danger: '#EF4444',
  debt: '#FF9800',
  loan: '#2196F3',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9E9E9E',
  textMuted: '#616161',

  // Border
  border: '#2A2A2A',
  borderLight: '#333333',

  // Categories colors
  food: '#FF7043',
  transport: '#42A5F5',
  entertainment: '#AB47BC',
  health: '#66BB6A',
  education: '#FFCA28',
  clothing: '#EC407A',
  utilities: '#26C6DA',
  other: '#78909C',

  // Chart colors
  chartColors: [
    '#6C63FF', '#FF5252', '#4CAF50', '#FF9800',
    '#2196F3', '#FF7043', '#AB47BC', '#FFCA28',
  ],
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const CATEGORY_ICONS: Record<string, string> = {
  food: '🍔',
  transport: '🚗',
  entertainment: '🎮',
  health: '💊',
  education: '📚',
  clothing: '👕',
  utilities: '💡',
  other: '📦',
  income: '💰',
  salary: '💼',
  freelance: '💻',
  gift: '🎁',
};

export const CATEGORY_LABELS_UZ: Record<string, string> = {
  food: 'Oziq-ovqat',
  transport: 'Transport',
  entertainment: 'Ko\'ngil ochar',
  health: 'Sog\'liq',
  education: 'Ta\'lim',
  clothing: 'Kiyim-kechak',
  utilities: 'Kommunal',
  other: 'Boshqa',
  salary: 'Maosh',
  freelance: 'Freelance',
  gift: 'Sovg\'a',
  income: 'Daromad',
};

export const CATEGORY_LABELS_EN: Record<string, string> = {
  food: 'Food',
  transport: 'Transport',
  entertainment: 'Entertainment',
  health: 'Health',
  education: 'Education',
  clothing: 'Clothing',
  utilities: 'Utilities',
  other: 'Other',
  salary: 'Salary',
  freelance: 'Freelance',
  gift: 'Gift',
  income: 'Income',
};
