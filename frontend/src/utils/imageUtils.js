// Fallback SVG Data URI when an image fails to load
export const FALLBACK_IMAGE_DATA_URI =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='2' y='2' width='20' height='20' rx='5' ry='5' fill='%230f172a'/><rect x='8' y='8' width='8' height='8' fill='%231e293b'/><line x1='12' y1='2' x2='12' y2='4'/><line x1='12' y1='20' x2='12' y2='22'/><line x1='2' y1='12' x2='4' y2='12'/><line x1='20' y1='12' x2='22' y2='12'/></svg>";

// Quantity Units List for electronics components, cables, sets, etc.
export const QUANTITY_UNITS = [
  'Pcs',
  'Set',
  'cm',
  'mm',
  'Meter',
  'Pack',
  'Roll',
  'Box',
  'Pair',
  'Kg',
  'Gram',
  'Litre',
];

// Utility to convert file to Base64 Data URL
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};
