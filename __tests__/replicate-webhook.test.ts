import { createMocks } from 'node-mocks-http'
import { POST } from '@/app/api/replicate/webhook/route'
import { createClient } from '@/lib/supabase'
import { Resend } from 'resend'

jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: { id: 'test-id' } }),
      single: jest.fn().mockResolvedValue({
        data: {
          user_id: 'test-user-id',
          email: 'test@example.com'
        }
      })
    }))
  }))
}))

jest.mock('resend', () => ({
  Resend: jest.fn(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'test-email-id' })
    }
  }))
}))

describe('Replicate Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('handles successful training completion', async () => {
    const { req } = createMocks({
      method: 'POST',
      headers: {
        'x-replicate-signature': 'test-signature'
      },
      body: {
        status: 'succeeded',
        id: 'test-training-id',
        output: {
          lora_url: 'https://example.com/model.safetensors'
        }
      }
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    const supabaseClient = createClient()
    expect(supabaseClient.from).toHaveBeenCalledWith('lora_training')
  })

  it('handles failed training', async () => {
    const { req } = createMocks({
      method: 'POST',
      headers: {
        'x-replicate-signature': 'test-signature'
      },
      body: {
        status: 'failed',
        id: 'test-training-id',
        error: 'Training failed'
      }
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    const supabaseClient = createClient()
    expect(supabaseClient.from).toHaveBeenCalledWith('lora_training')
  })

  it('rejects requests without signature', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        status: 'succeeded',
        id: 'test-training-id'
      }
    })

    const response = await POST(req)
    expect(response.status).toBe(401)
  })
})