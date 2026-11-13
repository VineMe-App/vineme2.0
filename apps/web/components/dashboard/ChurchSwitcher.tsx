"use client";

import { ChurchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/ui/menu";
import { useAdmin } from "@/lib/dashboard/admin-context";

export function ChurchSwitcher() {
  const { churchId, churchName, churches, switchChurch } = useAdmin();

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label={`Church: ${churchName ?? "Your church"}. Open church switcher`}
            title={churchName ?? undefined}
          />
        }
      >
        <ChurchIcon />
      </MenuTrigger>
      <MenuPopup align="end" className="min-w-60">
        <MenuGroup>
          <MenuGroupLabel>
            {churches.length > 1 ? "Switch church" : "Your church"}
          </MenuGroupLabel>
          <MenuRadioGroup value={churchId} onValueChange={switchChurch}>
            {churches.map((church) => (
              <MenuRadioItem key={church.id} value={church.id}>
                {church.name}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
          {churches.length === 1 ? (
            <p className="px-2 pb-1.5 text-muted-foreground text-xs">
              You manage this church only.
            </p>
          ) : null}
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
