import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { config } from './config'
import auth from './routes/auth'
import todos from './routes/todos'
import users from './routes/users'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', prettyJSON())
app.use('*', cors())

// Health check
app.get('/', (c) => {
  return c.json({
    message: 'Hono.js REST API with Prisma ORM',
    version: '1.0.0',
    status: 'running',
  })
})

// Routes
app.route('/api/auth', auth)
app.route('/api/todos', todos)
app.route('/api/users', users)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default {
  port: config.port,
  fetch: app.fetch,
}

console.log(`🚀 Server running on http://localhost:${config.port}`)
