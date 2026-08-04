import type { Meta, StoryObj } from '@storybook/nextjs'
import { expect, userEvent, within } from 'storybook/test'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Make changes to your profile here.
          </SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose asChild>
            <Button>Done</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  // The sheet content (a Dialog primitive) is portaled to document.body.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button', { name: 'Open sheet' }))
    const sheet = await within(document.body).findByRole('dialog')
    await expect(sheet).toBeVisible()
    await expect(
      within(sheet).getByRole('heading', { name: 'Edit profile' }),
    ).toBeInTheDocument()
  },
}
