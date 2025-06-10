import { ButtonHTMLAttributes } from 'react'
import { useStateMachine } from './StateMachine'

interface StateButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  to: string
}

export default function StateButton({ to, children, ...rest }: StateButtonProps) {
  const { gotoState } = useStateMachine()
  return (
    <button {...rest} onClick={() => gotoState(to)}>
      {children ?? to}
    </button>
  )
}
