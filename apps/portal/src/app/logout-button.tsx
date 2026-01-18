// apps/portal/src/app/logout-button.tsx
'use client'

import { Button } from '@daily/ui'
import { logout } from './login/actions'

export function LogoutButton() {
  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={() => logout()}
    >
      登出
    </Button>
  )
}
