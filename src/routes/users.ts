import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { adminOnly } from '../middleware/role'
import { hashPassword } from '../utils/password'
import {
  updateUserRoleSchema,
  updateUserStatusSchema,
  createUserByAdminSchema,
} from '../validators/user'

const users = new Hono()

// All user management routes require admin role
users.use('*', authMiddleware, adminOnly)

// Get all users (Admin only)
users.get('/', async (c) => {
  try {
    const page = Number(c.req.query('page')) || 1
    const limit = Number(c.req.query('limit')) || 10
    const skip = (page - 1) * limit
    const role = c.req.query('role') // Filter by role
    const status = c.req.query('status') // Filter by status

    const where: any = {}
    if (role) where.role = role
    if (status) where.status = status

    const [userList, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          birthDate: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { todos: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    return c.json({
      data: userList,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get user by ID (Admin only)
users.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        birthDate: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        todos: {
          select: {
            id: true,
            title: true,
            completed: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { todos: true },
        },
      },
    })

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({ data: user })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create user by admin (Admin only)
users.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const validatedData = createUserByAdminSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })

    if (existingUser) {
      return c.json({ error: 'Email already registered' }, 400)
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        phone: validatedData.phone,
        birthDate: validatedData.birthDate ? new Date(validatedData.birthDate) : null,
        role: validatedData.role,
        status: validatedData.status,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        birthDate: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    return c.json(
      {
        message: 'User created successfully',
        data: user,
      },
      201
    )
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update user role (Admin only)
users.patch('/:id/role', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const validatedData = updateUserRoleSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Update role
    const user = await prisma.user.update({
      where: { id },
      data: { role: validatedData.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    })

    return c.json({
      message: 'User role updated successfully',
      data: user,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update user status (Admin only)
users.patch('/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const validatedData = updateUserStatusSchema.parse(body)

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Update status
    const user = await prisma.user.update({
      where: { id },
      data: { status: validatedData.status },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    })

    return c.json({
      message: 'User status updated successfully',
      data: user,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Delete user (Admin only)
users.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const currentUser = c.get('user')

    // Prevent admin from deleting themselves
    if (id === currentUser.userId) {
      return c.json({ error: 'Cannot delete your own account' }, 400)
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Delete user (todos will be cascade deleted)
    await prisma.user.delete({
      where: { id },
    })

    return c.json({ message: 'User deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default users
