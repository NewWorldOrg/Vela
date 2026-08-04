import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'
import { ExampleForm } from '@/components/forms/ExampleForm'

const meta = {
  title: 'Forms/ExampleForm',
  component: ExampleForm,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ExampleForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const ShowsValidation: Story = {
  // Submitting empty surfaces the zod validation messages.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    await expect(
      await canvas.findByText('Username must be at least 2 characters.'),
    ).toBeInTheDocument()
    await expect(
      await canvas.findByText('Enter a valid email address.'),
    ).toBeInTheDocument()
  },
}
