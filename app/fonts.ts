import { Montserrat, Montserrat_Alternates } from 'next/font/google';

export const montserrat = Montserrat({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-montserrat',
  display: 'swap',
});

export const montserratAlternates = Montserrat_Alternates({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-montserrat-alternates',
  display: 'swap',
  weight: "900",
});