import { sign, verify } from 'hono/jwt'
import { config } from '../config'

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export const generateAccessToken = async (payload: JWTPayload): Promise<string> => {
  return await sign(
    {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutes
    },
    config.jwtSecret
  )
}

export const generateRefreshToken = async (payload: JWTPayload): Promise<string> => {
  return await sign(
    {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    },
    config.jwtRefreshSecret
  )
}

export const verifyAccessToken = async (token: string) => {
  try {
    return await verify(token, config.jwtSecret)
  } catch (error) {
    return null
  }
}

export const verifyRefreshToken = async (token: string) => {
  try {
    return await verify(token, config.jwtRefreshSecret)
  } catch (error) {
    return null
  }
}
