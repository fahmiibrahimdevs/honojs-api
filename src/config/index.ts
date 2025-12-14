export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-key',
  jwtExpiresIn: '15m', // Access token expires in 15 minutes
  jwtRefreshExpiresIn: '7d', // Refresh token expires in 7 days
}
