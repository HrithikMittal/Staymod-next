"use client";

import { deleteRoom, type RoomListItem } from "@/api-clients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type DeleteRoomDialogProps = {
  propertyId: string;
  room: RoomListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeleteRoomDialog({ propertyId, room, open, onOpenChange }: DeleteRoomDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!room) {
        throw new Error("No room selected.");
      }
      return deleteRoom(propertyId, room._id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogTitle>Delete room?</DialogTitle>
        <DialogDescription>
          {room ? (
            <>
              <span className="font-medium text-foreground">{room.name}</span> will be removed. This
              cannot be undone.
            </>
          ) : null}
        </DialogDescription>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!room || deleteMutation.isPending}
            onClick={() => deleteMutation.mutate()}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
        {deleteMutation.error ? (
          <p className="text-sm text-destructive">{deleteMutation.error.message}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
