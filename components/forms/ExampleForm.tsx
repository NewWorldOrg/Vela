'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z.object({
  username: z
    .string()
    .min(2, { message: 'Username must be at least 2 characters.' }),
  email: z.email({ message: 'Enter a valid email address.' }),
})

export type ExampleFormValues = z.infer<typeof formSchema>

interface ExampleFormProps {
  onSubmit?: (values: ExampleFormValues) => void
}

/**
 * Minimal react-hook-form + zod example demonstrating the shadcn `form`
 * primitives (label/control/description/message wiring and validation).
 */
export function ExampleForm({ onSubmit }: ExampleFormProps) {
  const form = useForm<ExampleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', email: '' },
  })

  function handleSubmit(values: ExampleFormValues) {
    onSubmit?.(values)
    toast.success('Profile saved', { description: values.username })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-80 space-y-6"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="your-handle" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save</Button>
      </form>
    </Form>
  )
}
