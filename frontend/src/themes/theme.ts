import { extendTheme } from '@chakra-ui/react';

const BLACK = '#0A0B0F';
const DARK_GRAY = '#16171B';
const CARD_BG = '#181A20';

const theme = extendTheme({
  colors: {
    brand: {
      400: CARD_BG,
      500: CARD_BG,
      600: DARK_GRAY,
      700: BLACK,
      800: BLACK,
      900: BLACK,
    },
    dark: {
      50: CARD_BG,
      100: CARD_BG,
      200: CARD_BG,
      300: DARK_GRAY,
      400: DARK_GRAY,
      500: DARK_GRAY,
      600: DARK_GRAY,
      700: BLACK,
      800: BLACK,
      900: BLACK,
    },
    accent: {
      400: CARD_BG,
      500: CARD_BG,
      600: DARK_GRAY,
      700: BLACK,
      800: BLACK,
      900: BLACK,
    },
    success: {
      400: '#2ecc71',
    },
    warning: {
      400: '#f1c40f',
    },
    error: {
      400: '#e74c3c',
    },
  },
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: BLACK,
        color: 'white',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
        outline: {
          borderColor: 'brand.500',
          color: 'brand.500',
          _hover: {
            bg: 'brand.500',
            color: 'white',
          },
        },
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        filled: {
          field: {
            bg: CARD_BG,
            borderColor: DARK_GRAY,
            color: 'white',
            _hover: {
              bg: DARK_GRAY,
            },
            _focus: {
              bg: DARK_GRAY,
              borderColor: 'brand.500',
            },
          },
        },
      },
    },
    Select: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        filled: {
          field: {
            bg: CARD_BG,
            borderColor: DARK_GRAY,
            color: 'white',
            _hover: {
              bg: DARK_GRAY,
            },
            _focus: {
              bg: DARK_GRAY,
              borderColor: 'brand.500',
            },
          },
        },
      },
    },
    Tabs: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
    Badge: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
});

export default theme; 