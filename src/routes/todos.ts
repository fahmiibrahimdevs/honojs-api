import { Hono } from 'hono'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { adminOnly } from '../middleware/role'
import { createTodoSchema, updateTodoSchema } from '../validators/todo'

const todos = new Hono()

// All todo routes require authentication
todos.use('*', authMiddleware)
    const limit = Number(c.req.query('limit')) || 10

// Get all todos
todos.get('/', async (c) => {
  try {
    const user = c.get('user')
    const page = Number(c.req.query('page')) || 1
    const limit = Number(c.req.query('limit')) || 10
    const skip = (page - 1) * limit

    // Admin can see all todos, user only their own
    const where = user.role === 'ADMIN' ? {} : { userId: user.userId }

    const [todoList, total] = await Promise.all([
      prisma.todo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.todo.count({ where }),
    ])

    return c.json({
      data: todoList,
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

// Get todo by ID
todos.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const user = c.get('user')

    const todo = await prisma.todo.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!todo) {
      return c.json({ error: 'Todo not found' }, 404)
    }

    // User can only access their own todos, admin can access all
    if (user.role !== 'ADMIN' && todo.userId !== user.userId) {
      return c.json({ error: 'Forbidden - You can only access your own todos' }, 403)
    }

    return c.json({ data: todo })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Create todo (All authenticated users)
todos.post('/', async (c) => {
  try {
    const user = c.get('user')
    const body = await c.req.json()
    const validatedData = createTodoSchema.parse(body)

    const todo = await prisma.todo.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        completed: validatedData.completed || false,
        userId: user.userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return c.json(
      {
        message: 'Todo created successfully',
        data: todo,
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

// Update todo
todos.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const user = c.get('user')
    const body = await c.req.json()
    const validatedData = updateTodoSchema.parse(body)

    // Check if todo exists
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
    })

    if (!existingTodo) {
      return c.json({ error: 'Todo not found' }, 404)
    }

    // User can only update their own todos, admin can update all
    if (user.role !== 'ADMIN' && existingTodo.userId !== user.userId) {
      return c.json({ error: 'Forbidden - You can only update your own todos' }, 403)
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.description !== undefined && {
          description: validatedData.description,
        }),
        ...(validatedData.completed !== undefined && {
          completed: validatedData.completed,
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return c.json({
      message: 'Todo updated successfully',
      data: todo,
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return c.json({ error: 'Validation failed', details: error.errors }, 400)
    }
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Delete todo
todos.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const user = c.get('user')

    // Check if todo exists
    const existingTodo = await prisma.todo.findUnique({
      where: { id },
    })

    if (!existingTodo) {
      return c.json({ error: 'Todo not found' }, 404)
    }

    // User can only delete their own todos, admin can delete all
    if (user.role !== 'ADMIN' && existingTodo.userId !== user.userId) {
      return c.json({ error: 'Forbidden - You can only delete your own todos' }, 403)
    }

    await prisma.todo.delete({
      where: { id },
    })

    return c.json({ message: 'Todo deleted successfully' })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default todos
