import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './avatar'

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
} satisfies Meta<typeof Avatar>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'Alice Smith',
    size: 'md',
  },
}

export const WithImage: Story = {
  args: {
    name: 'Bob Jones',
    src: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Bob',
    size: 'md',
  },
}

export const Small: Story = {
  args: {
    name: 'Charlie',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    name: 'Diana Prince',
    size: 'lg',
  },
}

export const AllSizes: Story = {
  args: { name: 'Alice' },
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar name="Alice" size="sm" />
      <Avatar name="Alice" size="md" />
      <Avatar name="Alice" size="lg" />
    </div>
  ),
}

export const MultipleUsers: Story = {
  args: { name: 'Alice Smith' },
  render: () => (
    <div className="flex items-center gap-2">
      <Avatar name="Alice Smith" />
      <Avatar name="Bob Jones" />
      <Avatar name="Charlie Brown" />
      <Avatar name="Diana Prince" />
      <Avatar name="Eve Wilson" />
    </div>
  ),
}
