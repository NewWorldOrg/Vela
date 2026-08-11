import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'

const meta = {
  title: 'UI/Sonner',
  component: Toaster,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast.success('Event created', {
            description: 'Sunday, December 03 at 9:00 AM',
          })
        }
      >
        Show toast
      </Button>
    </div>
  ),
  // The toast is portaled to document.body. Sonner renders the visible toast
  // as `[data-sonner-toast]` and announces it via an `aria-live` region.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Show toast' }))
    const body = within(document.body)
    await expect(await body.findByText('Event created')).toBeInTheDocument()
    await expect(
      document.querySelector('[data-sonner-toast]'),
    ).toBeInTheDocument()
    await expect(document.querySelector('[aria-live]')).toBeInTheDocument()
  },
}
