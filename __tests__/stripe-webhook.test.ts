import { createMocks } from 'node-mocks-http'
import { POST } from '@/app/api/webhooks/stripe/route'
import { createClient } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      match: jest.fn().mockResolvedValue({}),
    })),
  })),
}))

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}))

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('handles subscription.created event', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: {
              data: [{ price: { id: 'price_123' } }],
            },
            current_period_end: 1234567890,
            metadata: {
              userId: 'user_123',
            },
          },
        },
      },
    })

    const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock
    mockConstructEvent.mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          items: {
            data: [{ price: { id: 'price_123' } }],
          },
          current_period_end: 1234567890,
          metadata: {
            userId: 'user_123',
          },
        },
      },
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    const supabaseClient = createClient()
    expect(supabaseClient.from).toHaveBeenCalledWith('user_subscriptions')
  })

  it('handles invalid webhook signature', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {},
    })

    const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
  })
})