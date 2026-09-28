import jwt from 'jsonwebtoken';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'gelectronics_secret_jwt_key_2026_prod_token', {
    expiresIn: '30d',
  });
};
